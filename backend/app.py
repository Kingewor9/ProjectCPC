from flask import Flask, request, jsonify
from flask_cors import CORS
from models import ensure_indexes, init_mock_partners, upsert_user, partners, requests_col, campaigns, users
from scheduler import start_scheduler, check_and_post_campaigns, cleanup_finished_campaigns
from bot import send_message, send_open_button_message
from config import STARS_PER_CPC, TELEGRAM_BOT_TOKEN, BOT_ADMIN_CHAT_ID, APP_URL, BOT_URL
from auth import create_token, verify_token, token_required
from time_utils import parse_day_time_to_utc, calculate_end_time
import hmac, hashlib, time
import datetime
import os
import requests as http_requests
from models import channels, validate_channel_with_telegram, add_user_channel
from config import ADMIN_TELEGRAM_ID
from models import user_tasks
import uuid
import json
import logging
from models import transactions
from urllib.parse import parse_qsl


# Helper functions for matching durations and finding next available slot
def find_best_duration(channel_doc, requested_hours):
    try:
        # channel may store durationPrices or price_settings
        durations_map = channel_doc.get('durationPrices') or channel_doc.get('price_settings') or {}
        durations = []
        for k in durations_map.keys():
            try:
                durations.append(int(k))
            except Exception:
                continue
        if not durations:
            return int(requested_hours or 8)
        durations = sorted(set(durations))
        req = int(requested_hours or 0)
        if req in durations:
            return req
        # find highest duration <= requested
        lower = [d for d in durations if d <= req]
        if lower:
            return max(lower)
        # otherwise return the maximum available
        return max(durations)
    except Exception:
        return int(requested_hours or 8)


def find_least_duration(channel_doc):
    """Find the least (minimum) duration that a channel supports"""
    try:
        durations_map = channel_doc.get('durationPrices') or channel_doc.get('price_settings') or {}
        durations = []
        for k in durations_map.keys():
            try:
                durations.append(int(k))
            except Exception:
                continue
        if not durations:
            return 2  # default fallback
        return min(durations)
    except Exception:
        return 2  # default fallback


def find_next_slot_for_channel(channel_doc):
    # Try to use channel's configured acceptedDays/availableTimeSlots or selected_days/time_slots
    days = channel_doc.get('acceptedDays') or channel_doc.get('selected_days') or []
    slots = channel_doc.get('availableTimeSlots') or channel_doc.get('time_slots') or []
    now = datetime.datetime.utcnow()
    candidates = []
    for d in days:
        for s in slots:
            try:
                dt = parse_day_time_to_utc(d, s)
                if dt <= now:
                    dt = dt + datetime.timedelta(days=7)
                candidates.append(dt)
            except Exception:
                continue
    if candidates:
        return min(candidates)
    return now + datetime.timedelta(days=1)


app = Flask(__name__)
CORS(app)


def _normalize_channel_for_frontend(channel):
    """Normalize channel document for frontend consumption"""
    from models import get_telegram_file_url_from_file_id, refresh_channel_subscribers_from_telegram
    
    # Build duration prices from price_settings
    duration_prices = {}
    price_settings = channel.get('price_settings', {})
    for hours, settings in price_settings.items():
        if settings.get('enabled'):
            duration_prices[hours] = settings.get('price', 0)
    
    # If duration prices still empty, try to build from durationPrices field (backward compat)
    if not duration_prices:
        duration_prices = channel.get('durationPrices', {})
    
    # REFRESH AVATAR URL: If we have a file_id, regenerate the URL on each request
    # This ensures we always have a fresh, valid URL from Telegram
    avatar_url = channel.get('avatar', 'https://placehold.co/60x60')
    avatar_file_id = channel.get('avatar_file_id')
    if avatar_file_id:
        try:
            fresh_url = get_telegram_file_url_from_file_id(avatar_file_id, TELEGRAM_BOT_TOKEN)
            if fresh_url:
                avatar_url = fresh_url
        except Exception as e:
            # If refresh fails, fall back to stored URL
            print(f"Failed to refresh avatar URL: {e}")
            pass
    
    # REFRESH SUBSCRIBER COUNT: Get live data from Telegram
    current_subscribers = channel.get('subscribers', 0)
    telegram_channel_id = channel.get('telegram_id')
    if telegram_channel_id:
        try:
            fresh_subscribers = refresh_channel_subscribers_from_telegram(telegram_channel_id, TELEGRAM_BOT_TOKEN)
            if fresh_subscribers is not None:
                current_subscribers = fresh_subscribers
        except Exception as e:
            print(f"Failed to refresh subscriber count: {e}")
            # Fall back to stored count if refresh fails
            pass
            
    # ADDED: Normalize promos to ensure they have all required fields
    raw_promos = channel.get('promo_materials', [])
    # Also check promoMaterials for backward compatibility
    if not raw_promos:
        raw_promos = channel.get('promoMaterials', [])
    
    normalized_promos = []
    for idx, promo in enumerate(raw_promos):
        normalized_promo = {
            'id': promo.get('id') or f"promo_{idx+1}",
            'name': promo.get('name', 'Untitled'),
            'text': promo.get('text', promo.get('description', '')),
            'link': promo.get('link', ''),
            'image': promo.get('image', ''),
            'cta': promo.get('cta', '')
        }
        normalized_promos.append(normalized_promo)
    
    # Get selected days (handle both snake_case and camelCase)
    selected_days = channel.get('selected_days', [])
    if not selected_days:
        selected_days = channel.get('acceptedDays', [])
    
    # Get time slots (handle both snake_case and camelCase)
    time_slots = channel.get('time_slots', [])
    if not time_slots:
        time_slots = channel.get('availableTimeSlots', [])
    
    # Get promos per day (handle both snake_case and camelCase)
    promos_per_day = channel.get('promos_per_day', 1)
    if promos_per_day == 1:
        promos_per_day = channel.get('promosPerDay', 1)
    
    # Determine display status: Approved channels show as Active only if not paused
    status = channel.get('status', 'pending')
    is_paused = channel.get('is_paused', False)
    display_status = status
    if status == 'approved' and not is_paused:
        display_status = 'Active'
    elif status == 'approved' and is_paused:
        display_status = 'Paused'
    
    return {
        'id': channel.get('id'),
        'name': channel.get('name'),
        'topic': channel.get('topic'),
        'subs': current_subscribers,
        'lang': channel.get('language', 'en'),
        'avatar': avatar_url,
        'status': display_status,
        'acceptedDays': selected_days,
        'availableTimeSlots': time_slots,
        'durationPrices': duration_prices,
        'telegram_chat': channel.get('username', ''),
        'promos': normalized_promos,
        'promosPerDay': promos_per_day,
        'xExchanges': requests_col.count_documents({
            'status': 'Accepted',
            '$or': [
                {'fromChannelId': channel.get('id')},
                {'toChannelId': channel.get('id')}
            ]
        })
    }


def validate_telegram_webapp_data(init_data: str, bot_token: str) -> dict:
    """
    Validate Telegram WebApp initData
    Returns parsed data if valid, raises exception if invalid
    """
    try:
        # Parse the initData
        parsed_data = dict(parse_qsl(init_data))
        
        # Extract hash
        data_check_string_hash = parsed_data.pop('hash', None)
        if not data_check_string_hash:
            raise ValueError('Hash is missing')
        
        # Create data-check-string
        data_check_arr = [f"{k}={v}" for k, v in sorted(parsed_data.items())]
        data_check_string = '\n'.join(data_check_arr)
        
        # Calculate secret key
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Verify hash
        if calculated_hash != data_check_string_hash:
            raise ValueError('Invalid hash')
        
        # Check auth_date (data shouldn't be older than 24 hours)
        auth_date = int(parsed_data.get('auth_date', 0))
        current_time = int(time.time())
        if current_time - auth_date > 86400:  # 24 hours
            raise ValueError('Data is too old')
        
        # Parse user data
        user_data = json.loads(parsed_data.get('user', '{}'))
        
        return user_data
        
    except Exception as e:
        print(f"Validation error: {e}")
        raise

# This should be called by your scheduler when the campaign ends
def complete_invite_task(campaign_id, telegram_id):
    """Complete an invite task and reward the user"""
    try:
        # Add reward to user balance
        reward = 5000
        users.update_one(
            {'telegram_id': telegram_id},
            {
                '$inc': {'cpcBalance': reward},
                '$set': {'updated_at': datetime.datetime.utcnow()}
            }
        )
        
        # Mark invite task as fully completed
        user_tasks.update_one(
            {'telegram_id': telegram_id},
            {'$set': {'invite_users': True}}
        )
        
        print(f"Invite task completed for user {telegram_id}, rewarded {reward} CP")
        
        # Notify user
        if BOT_ADMIN_CHAT_ID:
            send_message(
                BOT_ADMIN_CHAT_ID,
                f"✅ Invite task completed!\n"
                f"User {telegram_id} earned {reward} CP Coins"
            )
        
    except Exception as e:
        print(f"Error completing invite task: {e}")
        
def generate_telegram_invoice(telegram_id, transaction_id, cpc_amount, stars_cost):
    """Generate a Telegram Stars invoice using Bot API"""
    try:
        # Create invoice using sendInvoice
        api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendInvoice"
        
        payload = {
            'chat_id': telegram_id,
            'title': f'Purchase {cpc_amount} CP Coins',
            'description': f'Buy {cpc_amount} CP Coins for use in CP Gram cross-promotions',
            'payload': transaction_id,  # Our unique transaction ID
            'provider_token': '',  # Empty for Stars
            'currency': 'XTR',  # Stars currency code
            'prices': json.dumps([{
                'label': f'{cpc_amount} CP Coins',
                'amount': stars_cost  # Amount in Stars
            }]),
            'max_tip_amount': 0,
            'suggested_tip_amounts': json.dumps([]),
            'start_parameter': 'buy_cpc',
            'photo_url': 'https://placehold.co/600x400/0078d4/FFFFFF?font=inter&text=Growth+Guru',
            'photo_width': 600,
            'photo_height': 400,
            'need_name': False,
            'need_phone_number': False,
            'need_email': False,
            'need_shipping_address': False,
            'send_phone_number_to_provider': False,
            'send_email_to_provider': False,
            'is_flexible': False
        }
        
        response = http_requests.post(api_url, data=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('ok'):
                # Generate deep link for payment
                message_id = result.get('result', {}).get('message_id')
                payment_url = f"https://t.me/{TELEGRAM_BOT_TOKEN.split(':')[0]}?start=pay_{message_id}"
                
                result['payment_url'] = payment_url
                return result
        
        print(f"Failed to generate invoice: {response.text}")
        return {'ok': False, 'error': response.text}
    
    except Exception as e:
        print(f"Error generating invoice: {e}")
        return {'ok': False, 'error': str(e)}
    

#Admin decoratorfor admin only
def admin_required(f):
    """Decorator to require admin access"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First check if user is authenticated
        if not hasattr(request, 'telegram_id'):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check if user is admin
        if request.telegram_id != ADMIN_TELEGRAM_ID:
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

#Api routes

@app.route('/api/auth/telegram', methods=['POST'])
def telegram_auth():
    payload = request.json or {}
    
    # FOR LOCAL TESTING ONLY
    if app.debug and payload.get('test_mode'):
        telegram_id = str(payload.get('id', '123456789'))
        
        user = upsert_user({
            'id': telegram_id,
            'first_name': payload.get('first_name', 'Test User'),
            'last_name': payload.get('last_name', ''),
            'username': payload.get('username', 'testuser'),
            'photo_url': payload.get('photo_url'),
            'auth_date': int(time.time())
        })
        token = create_token(telegram_id)
        
        # Get user's channels and normalize for frontend
        user_channels_raw = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        user_channels = [_normalize_channel_for_frontend(ch) for ch in user_channels_raw]
        
        return jsonify({
            'ok': True,
            'user': {
                **user,
                'channels': user_channels,
                'cpcBalance': user.get('cpcBalance', 0),
                'isAdmin': user.get('isAdmin', False)
            },
            'token': token
        })
    
    # Validate initData from Telegram WebApp
    init_data = payload.get('initData')
    if init_data:
        try:
            # Validate with Telegram
            user_data = validate_telegram_webapp_data(init_data, TELEGRAM_BOT_TOKEN)
            
            telegram_id = str(user_data.get('id'))
            
            # Upsert user (upsert_user now sets isAdmin)
            user = upsert_user({
                'id': telegram_id,
                'first_name': user_data.get('first_name'),
                'last_name': user_data.get('last_name', ''),
                'username': user_data.get('username', ''),
                'photo_url': user_data.get('photo_url'),
                'language_code': user_data.get('language_code', 'en'),
                'auth_date': int(time.time())
            })
            
            # Create token
            token = create_token(telegram_id)
            
            # Get user's channels and normalize for frontend
            user_channels_raw = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
            user_channels = [_normalize_channel_for_frontend(ch) for ch in user_channels_raw]
            
            return jsonify({
                'ok': True,
                'user': {
                    **user,
                    'channels': user_channels,
                    'cpcBalance': user.get('cpcBalance', 0),
                    'isAdmin': user.get('isAdmin', False)
                },
                'token': token
            })
            
        except Exception as e:
            print(f"WebApp validation error: {e}")
            return jsonify({'error': 'Invalid Telegram data'}), 400

@app.route('/api/me', methods=['GET'])
@token_required
def get_me():
    # Return the authenticated user's profile from database
    telegram_id = request.telegram_id
    user = users.find_one({'telegram_id': telegram_id}, {'_id': 0})
    if user:
        # Get user's channels and normalize for frontend
        user_channels_raw = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        user_channels = [_normalize_channel_for_frontend(ch) for ch in user_channels_raw]

        # Add channels to user object
        user['channels'] = user_channels
        
        # Ensure isAdmin flag is set (from database, not computed)
        if 'isAdmin' not in user:
            user['isAdmin'] = str(telegram_id) == str(ADMIN_TELEGRAM_ID)
        
        return jsonify(user)
    
    # User not found - return error
    return jsonify({'error': 'User not found'}), 404

    # If user not found in DB, return demo user structure (for testing)
    demo_user = {
        'telegram_id': telegram_id,
        'name': 'GrowthGuru',
        'cpcBalance': 11050,
        'channels': [
            { 'id': 'c1', 'name': 'Crypto Daily', 'topic': 'Crypto News', 'subs': 12500, 'xPromos': 45, 'status': 'Active', 'avatar': 'https://placehold.co/40x40/000000/FFFFFF?font=inter&text=CR', 'promos': [ { 'id': 'p1', 'name': 'Newbie Crypto Guide', 'link': 'https://t.me/cryptodaily/guide' }, { 'id': 'p2', 'name': 'Latest Market Flash', 'link': 'https://t.me/cryptodaily/flash' } ] },
            { 'id': 'c2', 'name': 'Quotes & Wisdom', 'topic': 'Quotes', 'subs': 5500, 'xPromos': 12, 'status': 'Paused', 'avatar': 'https://placehold.co/40x40/000000/FFFFFF?font=inter&text=QW', 'promos': [ { 'id': 'p3', 'name': 'Daily Inspiration Shot', 'link': 'https://t.me/quotes/daily' } ] },
            { 'id': 'c3', 'name': 'Tech Insights', 'topic': 'Technology', 'subs': 21000, 'xPromos': 80, 'status': 'Active', 'avatar': 'https://placehold.co/40x40/000000/FFFFFF?font=inter&text=TI', 'promos': [] }
        ]
    }
    #return jsonify(demo_user)


@app.route('/api/partners', methods=['GET'])
@token_required  # ADDED: Require authentication
def list_partners():
    """Get partner channels - channels the user has cross-promoted with"""
    telegram_id = request.telegram_id  # ADDED: Get authenticated user
    
    try:
        # CHANGED: Get user's completed campaigns to find actual partners
        user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        channel_ids = [ch.get('id') for ch in user_channels]
        
        if not channel_ids:
            # No channels, return empty list
            return jsonify([])
        
        # Find all channels that user has successfully cross-promoted with
        # Either as sender or receiver
        completed_requests = list(requests_col.find({
            'status': 'Accepted',
            '$or': [
                {'fromChannelId': {'$in': channel_ids}},
                {'toChannelId': {'$in': channel_ids}}
            ]
        }))
        
        # Extract partner channel IDs
        partner_ids = set()
        for req in completed_requests:
            from_id = req.get('fromChannelId')
            to_id = req.get('toChannelId')
            
            # Add the partner channel (not user's own channel)
            if from_id in channel_ids:
                partner_ids.add(to_id)
            if to_id in channel_ids:
                partner_ids.add(from_id)
        
        # Get partner channel details
        if not partner_ids:
            return jsonify([])
        
        partner_channels = list(channels.find({
            'id': {'$in': list(partner_ids)},
            'status': 'approved'
        }, {'_id': 0}))
        
        # Format partners to match expected structure
        formatted_partners = []
        for channel in partner_channels:
            # Build duration prices from price_settings
            duration_prices = {}
            price_settings = channel.get('price_settings', {})
            for hours, settings in price_settings.items():
                if settings.get('enabled'):
                    duration_prices[hours] = settings.get('price', 0)
            
            # If no duration prices, try durationPrices field (backward compatibility)
            if not duration_prices:
                duration_prices = channel.get('durationPrices', {})
            
            # Get accepted days (handle both snake_case and camelCase)
            accepted_days = channel.get('selected_days', [])
            if not accepted_days:
                accepted_days = channel.get('acceptedDays', [])
            
            # Get available time slots (handle both snake_case and camelCase)
            available_time_slots = channel.get('time_slots', [])
            if not available_time_slots:
                available_time_slots = channel.get('availableTimeSlots', [])
            
            # Get promos per day (handle both snake_case and camelCase)
            promos_per_day = channel.get('promos_per_day', channel.get('promosPerDay', 1))
            
            partner = {
                'id': channel.get('id'),
                'name': channel.get('name'),
                'topic': channel.get('topic'),
                'subs': channel.get('subscribers', 0),
                'lang': channel.get('language', 'en'),
                'avatar': channel.get('avatar', 'https://placehold.co/60x60'),
                'acceptedDays': accepted_days,
                'availableTimeSlots': available_time_slots,
                'durationPrices': duration_prices,
                'telegram_chat': channel.get('username', ''),
                'promosPerDay': promos_per_day,
                'xExchanges': requests_col.count_documents({
                    'status': 'Accepted',
                    '$or': [
                        {'fromChannelId': channel.get('id')},
                        {'toChannelId': channel.get('id')}
                    ]
                })
            }
            formatted_partners.append(partner)
        
        return jsonify(formatted_partners)
    
    except Exception as e:
        print(f"Error fetching partners: {e}")
        return jsonify([])

@app.route('/api/channels/all', methods=['GET'])
@token_required
def list_all_channels():
    """Get all approved active channels (for discovery)"""
    try:
        # Get all approved channels from the channels collection
        # Filter to show only approved channels that are not paused
        all_channels_raw = list(channels.find({'status': 'approved', 'is_paused': False}, {'_id': 0}))
        
        # Use the standard normalization function which now includes live subscriber refresh
        all_channels = [_normalize_channel_for_frontend(ch) for ch in all_channels_raw]
        
        return jsonify(all_channels)
    
    except Exception as e:
        print(f"Error fetching all channels: {e}")
        return jsonify([])
    
@app.route('/api/requests', methods=['GET'])
@token_required  # ADD authentication
def list_requests():
    """Get requests relevant to the authenticated user"""
    telegram_id = request.telegram_id  # ADD this
    
    try:
        # Get user's channels
        user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        channel_ids = [ch.get('id') for ch in user_channels]
        
        if not channel_ids:
            # No channels, return empty list
            return jsonify([])
        
        # Get requests where user is either sender OR receiver
        user_requests = list(requests_col.find({
            '$or': [
                {'fromChannelId': {'$in': channel_ids}},  # User sent the request
                {'toChannelId': {'$in': channel_ids}}      # User received the request
            ]
        }, {'_id': 0}))
        
        return jsonify(user_requests)
    
    except Exception as e:
        print(f"Error fetching requests: {e}")
        return jsonify([])


@app.route('/api/request', methods=['POST'])
@token_required
def create_request():
    data = request.json
    telegram_id = request.telegram_id
    
    # Validate channel status (must be approved/active, not pending or rejected)
    from_channel = channels.find_one({'id': data.get('fromChannelId')})
    if not from_channel:
        return jsonify({'error': 'Channel not found'}), 404
    
    status_raw = (from_channel.get('status') or '').lower()
    if status_raw in ['pending', 'rejected']:
        return jsonify({'error': f'Channel status is {status_raw}. Only approved channels can send cross-promotion requests.'}), 403
    
    # Check if channel is paused
    if from_channel.get('is_paused', False):
        return jsonify({'error': 'Your channel is currently paused. Please activate it to send cross-promotion requests.'}), 403
    
    # Validate user has sufficient CP coins balance
    user = users.find_one({'telegram_id': telegram_id})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    current_balance = user.get('cpcBalance', 0)
    cpc_cost = data.get('cpcCost', 0)
    
    if current_balance <= 0:
        return jsonify({'error': 'You have 0 CP coins balance. Please top up your account to send cross-promotion requests.'}), 403
    
    if current_balance < cpc_cost:
        return jsonify({'error': f'Insufficient balance. You need {cpc_cost} CPC but have {current_balance}.'}), 403
    
    # Deduct the cost from user's balance
    users.update_one(
        {'telegram_id': telegram_id},
        {'$inc': {'cpcBalance': -cpc_cost}}
    )
    
    req = {
        'fromChannel': data.get('fromChannel'),
        'fromChannelId': data.get('fromChannelId'),
        'toChannel': data.get('toChannel'),
        'toChannelId': data.get('toChannelId'),
        'daySelected': data.get('daySelected'),
        'timeSelected': data.get('timeSelected'),
        'duration': data.get('duration'),
        'cpcCost': data.get('cpcCost'),
        'promo': data.get('promo'),
        'status': 'Pending',
        'created_at': datetime.datetime.utcnow()
    }
    res = requests_col.insert_one(req)
    # store a string id for easy frontend references
    str_id = str(res.inserted_id)
    requests_col.update_one({'_id': res.inserted_id}, {'$set': {'id': str_id}})
    # notify the recipient channel owner via bot with an Open button (if channel exists)
    try:
        to_channel = channels.find_one({'id': req.get('toChannelId')})
        if to_channel and to_channel.get('owner_id'):
            owner_chat = to_channel.get('owner_id')
            text = (
                f"📨 New cross-promo request\n\nFrom: {req['fromChannel']}\nTo: {req['toChannel']}\n"
                f"Duration: {req.get('duration')} hrs\nScheduled: {req.get('daySelected')} {req.get('timeSelected')}"
            )
            try:
                send_open_button_message(owner_chat, text)
            except Exception:
                # fallback to simple message
                send_message(owner_chat, text)
        # also notify admin for monitoring
        if BOT_ADMIN_CHAT_ID:
            send_message(BOT_ADMIN_CHAT_ID, f"New cross-promo request from {req['fromChannel']} to {req['toChannel']}")
    except Exception:
        if BOT_ADMIN_CHAT_ID:
            send_message(BOT_ADMIN_CHAT_ID, f"New cross-promo request (failed to notify owner) from {req['fromChannel']} to {req['toChannel']}")
    return jsonify({'ok': True, 'id': str_id})


@app.route('/api/request/<req_id>/accept', methods=['POST'])
@token_required
def accept_request(req_id):
    telegram_id = request.telegram_id
    body = request.json or {}
    
    # Get the request
    req = requests_col.find_one({'id': req_id})
    if not req:
        return jsonify({'error': 'Request not found'}), 404

    # Get recipient channel (the one accepting)
    to_ch = channels.find_one({'id': req.get('toChannelId')})
    if not to_ch:
        return jsonify({'error': 'Recipient channel not found'}), 404
    
    # Verify user is the owner of the recipient channel
    if to_ch.get('owner_id') != telegram_id:
        return jsonify({'error': 'You do not have permission to accept this request'}), 403

    # Mark request as accepted
    requests_col.update_one(
        {'id': req_id}, 
        {
            '$set': {
                'status': 'Accepted',
                'accepted_at': datetime.datetime.utcnow(),
                'accepted_by': telegram_id
            }
        }
    )

    # Get the selected promo from acceptor
    selected_promo = body.get('selected_promo') or {}
    
    # Get requester's promo
    requester_promo = req.get('promo') or {}

    # Get channel docs
    from_ch = channels.find_one({'id': req.get('fromChannelId')})
    
    # Get CPC cost from request
    cpc_cost = req.get('cpcCost', 0)
    duration = req.get('duration', 2)
    
    try:
        from models import create_single_manual_campaign
        
        # Create ONE campaign that tracks both users
        campaign_id = create_single_manual_campaign(
            request_id=req['_id'],
            from_channel_id=req.get('fromChannelId'),
            to_channel_id=req.get('toChannelId'),
            requester_promo=requester_promo,
            acceptor_promo=selected_promo,
            duration_hours=duration,
            cpc_cost=cpc_cost
        )
        
        # Notify both parties
        if from_ch and from_ch.get('owner_id'):
            msg = (
                f"✅ Your cross-promo request was accepted!\n\n"
                f"Partner: {to_ch.get('name')}\n"
                f"Next steps:\n"
                f"1. Check your Campaigns page\n"
                f"2. Get the promo from Telegram\n"
                f"3. Post it manually on your channel\n"
                f"4. Submit your post link to start your campaign"
            )
            try:
                send_open_button_message(from_ch.get('owner_id'), msg)
            except:
                send_message(from_ch.get('owner_id'), msg)
        
        if to_ch and to_ch.get('owner_id'):
            msg = (
                f"✅ You accepted the request!\n\n"
                f"Partner: {from_ch.get('name') if from_ch else 'Unknown'}\n"
                f"Next steps:\n"
                f"1. Check your Campaigns page\n"
                f"2. Get the promo from Telegram\n"
                f"3. Post it manually on your channel\n"
                f"4. Submit your post link to start your campaign"
            )
            try:
                send_open_button_message(to_ch.get('owner_id'), msg)
            except:
                send_message(to_ch.get('owner_id'), msg)
        
        return jsonify({
            'ok': True,
            'message': 'Request accepted! Check your Campaigns page.',
            'campaign_id': campaign_id
        })
        
    except Exception as e:
        print(f"Error creating campaign: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to create campaign'}), 500

#Updated campaign to match new logic
@app.route('/api/campaigns', methods=['GET'])
@token_required
def list_campaigns():
    """Get campaigns relevant to the authenticated user"""
    telegram_id = request.telegram_id
    
    try:
        from models import get_user_campaigns
        user_campaigns = get_user_campaigns(telegram_id)
        
        # Convert datetime objects to ISO strings and remove ALL ObjectId fields
        for campaign in user_campaigns:
            # Remove ALL MongoDB ObjectId fields that could cause issues
            campaign.pop('_id', None)
            campaign.pop('request_id', None)
            
            # Also remove nested ObjectIds in promos if they exist
            if 'requester_promo' in campaign and isinstance(campaign['requester_promo'], dict):
                campaign['requester_promo'].pop('_id', None)
            if 'acceptor_promo' in campaign and isinstance(campaign['acceptor_promo'], dict):
                campaign['acceptor_promo'].pop('_id', None)
            if 'promo' in campaign and isinstance(campaign['promo'], dict):
                campaign['promo'].pop('_id', None)
            
            # Convert datetime objects to ISO strings
            for field in ['requester_posted_at', 'requester_ended_at', 
                         'acceptor_posted_at', 'acceptor_ended_at',
                         'created_at', 'updated_at', 'actual_start_at', 'actual_end_at', 'posting_deadline']:
                if field in campaign and campaign[field]:
                    campaign[field] = campaign[field].isoformat()
        
        return jsonify(user_campaigns)
    
    except Exception as e:
        print(f"Error fetching campaigns: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch campaigns'}), 500

# NEW ENDPOINT: Send promo to Telegram
@app.route('/api/campaigns/<campaign_id>/send-to-telegram', methods=['POST'])
@token_required
def send_campaign_to_telegram(campaign_id):
    """Send the promo material to user's Telegram for manual posting"""
    telegram_id = request.telegram_id
    
    try:
        campaign = campaigns.find_one({'id': campaign_id})
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404
        
        # Verify user owns one of the channels
        from_id = campaign.get('fromChannelId')
        to_id = campaign.get('toChannelId')
        
        from_ch = channels.find_one({'id': from_id})
        to_ch = channels.find_one({'id': to_id})
        
        if not from_ch or not to_ch:
            return jsonify({'error': 'Channel not found'}), 404
        
        if from_ch.get('owner_id') != telegram_id and to_ch.get('owner_id') != telegram_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Determine which promo to send based on user role
        is_requester = from_ch.get('owner_id') == telegram_id
        
        if is_requester:
            promo = campaign.get('acceptor_promo', {})
        else:
            promo = campaign.get('requester_promo', {})
        
        # Send via bot WITHOUT preview label
        from bot import send_campaign_promo_for_posting
        result = send_campaign_promo_for_posting(
            chat_id=telegram_id,
            promo_text=promo.get('text', ''),
            promo_link=promo.get('link', ''),
            promo_image=promo.get('image', ''),
            promo_cta=promo.get('cta', 'Learn More')
        )
        
        if result and result.get('ok'):
            return jsonify({
                'ok': True,
                'message': 'Promo sent to your Telegram!'
            })
        else:
            return jsonify({'error': 'Failed to send to Telegram'}), 500
            
    except Exception as e:
        print(f"Error sending to Telegram: {e}")
        return jsonify({'error': str(e)}), 500

# NEW ENDPOINT: Verify post and start campaign immediately
@app.route('/api/campaigns/<campaign_id>/verify-and-start', methods=['POST'])
@token_required
def verify_and_start_campaign(campaign_id):
    """User submits their post link and starts their campaign immediately"""
    telegram_id = request.telegram_id
    data = request.json or {}
    post_link = data.get('post_link', '').strip()
    
    if not post_link:
        return jsonify({'error': 'Post link is required'}), 400
    
    try:
        campaign = campaigns.find_one({'id': campaign_id})
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404
        
        # Verify user owns one of the channels
        from_id = campaign.get('fromChannelId')
        to_id = campaign.get('toChannelId')
        
        from_ch = channels.find_one({'id': from_id})
        to_ch = channels.find_one({'id': to_id})
        
        if not from_ch or not to_ch:
            return jsonify({'error': 'Channel not found'}), 404
        
        if from_ch.get('owner_id') != telegram_id and to_ch.get('owner_id') != telegram_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Verify and start
        from models import verify_and_start_user_campaign
        result = verify_and_start_user_campaign(campaign_id, telegram_id, post_link)
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify({
            'ok': True,
            'message': 'Campaign started! Timer is now running.'
        })
        
    except Exception as e:
        print(f"Error verifying post: {e}")
        return jsonify({'error': str(e)}), 500


# NEW ENDPOINT: End campaign and get reward
@app.route('/api/campaigns/<campaign_id>/end', methods=['POST'])
@token_required
def end_campaign(campaign_id):
    """End user's campaign and distribute reward"""
    telegram_id = request.telegram_id
    
    try:
        campaign = campaigns.find_one({'id': campaign_id})
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404
        
        # Verify user owns one of the channels
        from_id = campaign.get('fromChannelId')
        to_id = campaign.get('toChannelId')
        
        from_ch = channels.find_one({'id': from_id})
        to_ch = channels.find_one({'id': to_id})
        
        if not from_ch or not to_ch:
            return jsonify({'error': 'Channel not found'}), 404
        
        if from_ch.get('owner_id') != telegram_id and to_ch.get('owner_id') != telegram_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # End and distribute rewards
        from models import end_user_campaign_and_reward
        result = end_user_campaign_and_reward(campaign_id, telegram_id)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Notify user
        role = result.get('role')
        reward = result.get('reward')
        
        msg = f"✅ Campaign Completed!\n\nYou earned {reward} CP Coins!"
        try:
            send_open_button_message(telegram_id, msg)
        except:
            send_message(telegram_id, msg)
        
        return jsonify({
            'ok': True,
            'message': 'Campaign completed!',
            'reward': reward
        })
        
    except Exception as e:
        print(f"Error ending campaign: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/channels/validate', methods=['POST'])
@token_required
def validate_channel():
    """Validate a Telegram channel link or username"""
    data = request.json or {}
    channel_input = data.get('channel_input', '').strip()
    
    if not channel_input:
        return jsonify({'error': 'Channel input is required'}), 400
    
    # Clean up the input to get username
    username = channel_input.replace('@', '').replace('https://t.me/', '').replace('http://t.me/', '')
    
    try:
        # Call Telegram API to get channel info
        channel_info = validate_channel_with_telegram(username, TELEGRAM_BOT_TOKEN)
        
        if not channel_info:
            return jsonify({'error': 'Invalid channel. Please check the link and try again.'}), 400
        
        return jsonify({
            'ok': True,
            'channel': channel_info
        })
    
    except Exception as e:
        print(f"Error validating channel: {e}")
        return jsonify({'error': 'Failed to validate channel. Please try again.'}), 500

@app.route('/api/channels', methods=['POST'])
@token_required
def create_channel():
    """Save a new channel configuration"""
    telegram_id = request.telegram_id
    data = request.json or {}
    
    # Validate required fields
    required_fields = ['channel_info', 'topic', 'selected_days', 'promos_per_day', 
                      'price_settings', 'time_slots', 'promo_materials', 'bot_connected']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate at least one price is enabled
    price_settings = data.get('price_settings', {})
    if not any(p.get('enabled') for p in price_settings.values()):
        return jsonify({'error': 'At least one duration price must be enabled'}), 400
    
    # Validate bot connection
    if not data.get('bot_connected'):
        return jsonify({'error': 'Bot must be connected to the channel'}), 400
    
    # Validate promo materials
    promo_materials = data.get('promo_materials', [])
    if len(promo_materials) == 0:
        return jsonify({'error': 'At least one promo material is required'}), 400
    if len(promo_materials) > 3:
        return jsonify({'error': 'Maximum 3 promo materials allowed'}), 400
    
    # ADDED: Ensure each promo has required fields with proper structure
    processed_promos = []
    for idx, promo in enumerate(promo_materials):
     processed_promo = {
        'id': promo.get('id') or f"promo_{idx+1}",  # Generate ID if missing
        'name': promo.get('name', 'Untitled'),
        'text': promo.get('text', promo.get('description', '')),  # text or description
        'link': promo.get('link', ''),
        'image': promo.get('image', ''),
        'cta': promo.get('cta', '')
    }
    processed_promos.append(processed_promo)

    # Replace promo_materials with processed version
    data['promo_materials'] = processed_promos
    
    # Validate time slots match promos_per_day
    time_slots = data.get('time_slots', [])
    promos_per_day = data.get('promos_per_day', 1)
    if len(time_slots) != promos_per_day:
        return jsonify({'error': f'Must select exactly {promos_per_day} time slot(s)'}), 400
    
    try:
        # Add channel to database
        channel_id = add_user_channel(
            telegram_id=telegram_id,
            channel_info=data['channel_info'],
            topic=data['topic'],
            selected_days=data['selected_days'],
            promos_per_day=data['promos_per_day'],
            price_settings=data['price_settings'],
            time_slots=data['time_slots'],
            promo_materials=data['promo_materials']
        )
        
        # Notify admin about new channel submission
        if BOT_ADMIN_CHAT_ID:
            channel_name = data['channel_info'].get('name', 'Unknown')
            send_message(
                BOT_ADMIN_CHAT_ID, 
                f"🆕 New channel submitted for moderation:\n"
                f"Channel: {channel_name}\n"
                f"Owner: {telegram_id}\n"
                f"Topic: {data['topic']}"
            )
        
        return jsonify({
            'ok': True,
            'channel_id': channel_id,
            'message': 'Channel submitted successfully. It will be moderated within 48-72 hours.'
        })
    
    except Exception as e:
        print(f"Error creating channel: {e}")
        return jsonify({'error': 'Failed to save channel. Please try again.'}), 500

@app.route('/api/channels', methods=['GET'])
@token_required
def get_user_channels():
    """Get all channels for the authenticated user"""
    telegram_id = request.telegram_id
    
    try:
        user_channels_raw = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        user_channels = [_normalize_channel_for_frontend(ch) for ch in user_channels_raw]
        return jsonify(user_channels)
    except Exception as e:
        print(f"Error fetching channels: {e}")
        return jsonify({'error': 'Failed to fetch channels'}), 500
    
@app.route('/api/channels/<channel_id>', methods=['GET'])
@token_required
def get_channel(channel_id):
    """Get a specific channel by ID"""
    telegram_id = request.telegram_id
    
    try:
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id}, {'_id': 0})

        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        # Normalize for frontend compatibility
        normalized = _normalize_channel_for_frontend(channel)

        frontend_channel = {
            'id': normalized.get('id'),
            'name': normalized.get('name'),
            'username': normalized.get('telegram_chat', ''),
            'avatar': normalized.get('avatar', ''),
            'subscribers': normalized.get('subs', 0),
            'is_paused': channel.get('is_paused', False),
            'topic': normalized.get('topic', ''),
            'status': normalized.get('status', ''),
            'acceptedDays': normalized.get('acceptedDays', []),
            'promosPerDay': normalized.get('promosPerDay', 1),
            'durationPrices': normalized.get('durationPrices', {}),
            'availableTimeSlots': normalized.get('availableTimeSlots', []),
            'promoMaterials': normalized.get('promos', []),
            'price_settings': channel.get('price_settings', {}),
            'promo_materials': channel.get('promo_materials', [])
        }

        return jsonify(frontend_channel)
    except Exception as e:
        print(f"Error fetching channel: {e}")
        return jsonify({'error': 'Failed to fetch channel'}), 500

@app.route('/api/channels/<channel_id>', methods=['PUT'])
@token_required
def update_channel(channel_id):
    """Update a channel configuration"""
    telegram_id = request.telegram_id
    data = request.json or {}
    
    try:
        # Check if channel exists and belongs to user
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id})
        
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        # Update allowed fields
        update_fields = {}
        allowed_fields = ['topic', 'selected_days', 'promos_per_day', 'price_settings', 
                         'time_slots', 'promo_materials']
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        if update_fields:
            update_fields['updated_at'] = datetime.datetime.utcnow()
            channels.update_one(
                {'id': channel_id, 'owner_id': telegram_id},
                {'$set': update_fields}
            )
        
        return jsonify({'ok': True, 'message': 'Channel updated successfully'})
    
    except Exception as e:
        print(f"Error updating channel: {e}")
        return jsonify({'error': 'Failed to update channel'}), 500
    
@app.route('/api/channels/<channel_id>', methods=['DELETE'])
@token_required
def delete_channel(channel_id):
    """Delete a channel"""
    telegram_id = request.telegram_id
    
    try:
        result = channels.delete_one({'id': channel_id, 'owner_id': telegram_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Channel not found'}), 404
        
        return jsonify({'ok': True, 'message': 'Channel deleted successfully'})
    
    except Exception as e:
        print(f"Error deleting channel: {e}")
        return jsonify({'error': 'Failed to delete channel'}), 500

@app.route('/api/channels/<channel_id>/status', methods=['PUT'])
@token_required
def update_channel_status_route(channel_id):
    """Update channel status (pause/activate)"""
    telegram_id = request.telegram_id
    data = request.json or {}
    new_status = data.get('status')
    
    if new_status not in ['approved', 'paused']:
        return jsonify({'error': 'Invalid status. Must be "approved" or "paused"'}), 400
    
    try:
        # Check if channel exists and belongs to user
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id})
        
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        # Don't allow status change if channel is still pending
        if channel.get('status') == 'pending':
            return jsonify({'error': 'Cannot change status of pending channel'}), 400
        
        # Update status
        channels.update_one(
            {'id': channel_id, 'owner_id': telegram_id},
            {'$set': {'status': new_status, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        return jsonify({
            'ok': True, 
            'message': f'Channel {new_status} successfully',
            'status': new_status
        })
    
    except Exception as e:
        print(f"Error updating channel status: {e}")
        return jsonify({'error': 'Failed to update channel status'}), 500


@app.route('/api/channels/<channel_id>/pause', methods=['PUT'])
@token_required
def pause_channel(channel_id):
    """Pause or unpause an approved channel"""
    telegram_id = request.telegram_id
    data = request.json or {}
    is_paused = data.get('is_paused', True)
    
    try:
        # Check if channel exists and belongs to user
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id})
        
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        # Only approved channels can be paused/unpaused
        if channel.get('status') != 'approved':
            return jsonify({'error': 'Only approved channels can be paused'}), 400
        
        # Update pause status
        channels.update_one(
            {'id': channel_id, 'owner_id': telegram_id},
            {'$set': {'is_paused': is_paused, 'updated_at': datetime.datetime.utcnow()}}
        )
        
        status_msg = 'paused' if is_paused else 'activated'
        return jsonify({
            'ok': True, 
            'message': f'Channel {status_msg} successfully',
            'is_paused': is_paused
        })
    
    except Exception as e:
        print(f"Error updating channel pause status: {e}")
        return jsonify({'error': 'Failed to update channel pause status'}), 500
    
@app.route('/api/tasks', methods=['GET'])
@token_required
def get_tasks():
    """Get available tasks for the user"""
    telegram_id = request.telegram_id
    
    try:
        # Get user's completed tasks
        completed_tasks = user_tasks.find_one({'user_id': telegram_id}) or {}
        
        # Define available tasks
        tasks = [
            {
                'id': 'welcome_bonus',
                'title': 'Welcome Bonus',
                'description': 'Get started with a special one-time bonus for new users!',
                'reward': 500,
                'type': 'welcome',
                'completed': completed_tasks.get('welcome_bonus', False),
                'actionText': 'Claim'
            },
            {
                'id': 'join_channel',
                'title': 'Join the News Channel',
                'description': 'Stay updated with the latest news and announcements from CP Gram!',
                'reward': 250,
                'type': 'join_channel',
                'completed': completed_tasks.get('join_channel', False),
                'actionText': 'Join'
            },
            {
                'id': 'invite_users',
                'title': 'Invite Users',
                'description': 'Share a promotional post on your channel to invite new users.',
                'reward': 5000,
                'type': 'invite_users',
                'completed': completed_tasks.get('invite_users', False),
                'actionText': 'Invite'
            }
        ]
        
        return jsonify({'tasks': tasks})
    
    except Exception as e:
        print(f"Error fetching tasks: {e}")
        return jsonify({'error': 'Failed to fetch tasks'}), 500


@app.route('/api/tasks/claim-welcome', methods=['POST'])
@token_required
def claim_welcome_bonus():
    """Claim the welcome bonus"""
    telegram_id = request.telegram_id
    
    try:
        # Check if already claimed
        task_record = user_tasks.find_one({'user_id': telegram_id})
        
        if task_record and task_record.get('welcome_bonus'):
            return jsonify({'error': 'Welcome bonus already claimed'}), 400
        
        # Update user balance
        reward = 500
        users.update_one(
            {'telegram_id': telegram_id},
            {
                '$inc': {'cpcBalance': reward},
                '$set': {'updated_at': datetime.datetime.utcnow()}
            }
        )
        
        # Mark task as completed
        user_tasks.update_one(
            {'user_id': telegram_id},
            {
                '$set': {
                    'welcome_bonus': True,
                    'welcome_bonus_claimed_at': datetime.datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return jsonify({
            'ok': True,
            'reward': reward,
            'message': 'Welcome bonus claimed successfully!'
        })
    
    except Exception as e:
        print(f"Error claiming welcome bonus: {e}")
        return jsonify({'error': 'Failed to claim welcome bonus'}), 500


@app.route('/api/tasks/verify-channel-join', methods=['POST'])
@token_required
def verify_channel_join():
    """Verify user joined the news channel"""
    telegram_id = request.telegram_id
    
    try:
        # Check if already completed
        task_record = user_tasks.find_one({'user_id': telegram_id})
        if task_record and task_record.get('join_channel'):
            return jsonify({'error': 'Channel join already verified'}), 400
        
        # Verify user is member of the channel using Bot API
        # The channel is @cpgram_news
        try:
            api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getChatMember"
            response = http_requests.get(
                api_url, 
                params={
                    'chat_id': '@cpgram_news',
                    'user_id': telegram_id
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('ok'):
                    member = data.get('result', {})
                    status = member.get('status')
                    
                    # Check if user is a member (not left or kicked)
                    if status in ['member', 'administrator', 'creator']:
                        # User is a member, reward them
                        reward = 250
                        users.update_one(
                            {'telegram_id': telegram_id},
                            {
                                '$inc': {'cpcBalance': reward},
                                '$set': {'updated_at': datetime.datetime.utcnow()}
                            }
                        )
                        
                        # Mark task as completed
                        user_tasks.update_one(
                            {'user_id': telegram_id},
                            {
                                '$set': {
                                    'join_channel': True,
                                    'join_channel_verified_at': datetime.datetime.utcnow()
                                }
                            },
                            upsert=True
                        )
                        
                        return jsonify({
                            'ok': True,
                            'reward': reward,
                            'message': 'Channel membership verified!'
                        })
                    else:
                        return jsonify({'error': 'Please join the channel first'}), 400
        
        except http_requests.RequestException as e:
            print(f"Error verifying channel membership: {e}")
            # If verification fails, still allow completion (for testing)
            # In production, you might want to be stricter
            return jsonify({'error': 'Failed to verify membership. Please try again.'}), 500
        
        return jsonify({'error': 'Failed to verify channel membership'}), 400
    
    except Exception as e:
        print(f"Error verifying channel join: {e}")
        return jsonify({'error': 'Failed to verify channel join'}), 500

@app.route('/api/tasks/invite/initiate', methods=['POST'])
@token_required
def initiate_invite_task():
    """Initiate invite task - user selects channel"""
    telegram_id = request.telegram_id
    data = request.json or {}
    channel_id = data.get('channel_id')
    
    if not channel_id:
        return jsonify({'error': 'Channel ID is required'}), 400
    
    try:
        # Check if task already completed
        task_record = user_tasks.find_one({'user_id': telegram_id})
        
        if task_record and task_record.get('invite_task_completed'):
            return jsonify({'error': 'Invite task already completed. Wait for admin to renew it.'}), 400
        
        # Verify channel belongs to user
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id})
        
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        # Check if channel is active
        status_raw = (channel.get('status') or '').lower()
        if status_raw not in ['approved', 'active']:
            return jsonify({'error': 'Channel must be active to complete this task'}), 400
        
        # Create invite task campaign (similar to regular campaigns but for invite task)
        invite_task_id = f"invite_{uuid.uuid4().hex[:12]}"
        
        invite_task = {
            'id': invite_task_id,
            'type': 'invite_task',
            'user_id': telegram_id,
            'channel_id': channel_id,
            'channel_name': channel.get('name'),
            'telegram_chat_id': channel.get('telegram_id'),
            'status': 'pending_posting',
            'duration_hours': 12,
            'reward': 5000,
            'promo': {
                'name': 'CP Gram Promo',
                'text': (
                    "🚀 Grow Your Telegram Channel with CP Gram!\n\n"
                    "The ultimate cross-promotion platform for Telegram channels.\n\n"
                    "✅ Connect with similar channels\n"
                    "✅ Manual posting control\n"
                    "✅ Fair pricing system\n"
                    "✅ Earn rewards\n\n"
                    "Join thousands of growing channels today!"
                ),
                'link': BOT_URL,
                'image': 'https://ibb.co/Y7V6fX6c',
                'cta': '🚀 Join CP Gram'
            },
            'post_link': None,
            'posted_at': None,
            'ended_at': None,
            'reward_given': False,
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        campaigns.insert_one(invite_task)
        
        return jsonify({
            'ok': True,
            'invite_task_id': invite_task_id,
            'message': 'Invite task initiated! Get the promo and post it on your channel.'
        })
    
    except Exception as e:
        print(f"Error initiating invite task: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to initiate invite task'}), 500


@app.route('/api/tasks/invite/<task_id>/send-promo', methods=['POST'])
@token_required
def send_invite_promo_to_telegram(task_id):
    """Send invite promo to user's Telegram"""
    telegram_id = request.telegram_id
    
    try:
        invite_task = campaigns.find_one({'id': task_id, 'type': 'invite_task'})
        
        if not invite_task:
            return jsonify({'error': 'Invite task not found'}), 404
        
        # Verify user owns this task
        if invite_task.get('user_id') != telegram_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get promo
        promo = invite_task.get('promo', {})
        
        # Send via bot WITHOUT preview label
        from bot import send_campaign_promo_for_posting
        result = send_campaign_promo_for_posting(
            chat_id=telegram_id,
            promo_text=promo.get('text', ''),
            promo_link=promo.get('link', ''),
            promo_image=promo.get('image', ''),
            promo_cta=promo.get('cta', 'Join Now')
        )
        
        if result and result.get('ok'):
            return jsonify({
                'ok': True,
                'message': 'Promo sent to your Telegram!'
            })
        else:
            return jsonify({'error': 'Failed to send to Telegram'}), 500
            
    except Exception as e:
        print(f"Error sending invite promo: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/invite/<task_id>/verify-and-start', methods=['POST'])
@token_required
def verify_invite_post_and_start(task_id):
    """User submits post link and starts invite task timer"""
    telegram_id = request.telegram_id
    data = request.json or {}
    post_link = data.get('post_link', '').strip()
    
    if not post_link:
        return jsonify({'error': 'Post link is required'}), 400
    
    try:
        invite_task = campaigns.find_one({'id': task_id, 'type': 'invite_task'})
        
        if not invite_task:
            return jsonify({'error': 'Invite task not found'}), 404
        
        # Verify user owns this task
        if invite_task.get('user_id') != telegram_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update task status to active
        now = datetime.datetime.utcnow()
        campaigns.update_one(
            {'id': task_id},
            {
                '$set': {
                    'status': 'active',
                    'post_link': post_link,
                    'posted_at': now,
                    'updated_at': now
                }
            }
        )
        
        # Notify admin for verification
        channel_name = invite_task.get('channel_name', 'Unknown')
        user = users.find_one({'telegram_id': telegram_id})
        user_name = user.get('first_name', 'User') if user else 'User'
        
        admin_msg = (
            f"📢 New Invite Task Post\n\n"
            f"User: {user_name} ({telegram_id})\n"
            f"Channel: {channel_name}\n"
            f"Post: {post_link}\n\n"
            f"Please verify the post."
        )
        
        if BOT_ADMIN_CHAT_ID:
            send_message(BOT_ADMIN_CHAT_ID, admin_msg)
        
        return jsonify({
            'ok': True,
            'message': 'Post verified! Timer started. Admin has been notified.'
        })
        
    except Exception as e:
        print(f"Error verifying invite post: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/invite/<task_id>/complete', methods=['POST'])
@token_required
def complete_invite_task_endpoint(task_id):
    """Complete invite task and give reward"""
    telegram_id = request.telegram_id
    
    try:
        invite_task = campaigns.find_one({'id': task_id, 'type': 'invite_task'})
        
        if not invite_task:
            return jsonify({'error': 'Invite task not found'}), 404
        
        # Verify user owns this task
        if invite_task.get('user_id') != telegram_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if already rewarded
        if invite_task.get('reward_given'):
            return jsonify({'error': 'Reward already claimed'}), 400
        
        # Give reward
        reward = invite_task.get('reward', 5000)
        users.update_one(
            {'telegram_id': telegram_id},
            {
                '$inc': {'cpcBalance': reward},
                '$set': {'updated_at': datetime.datetime.utcnow()}
            }
        )
        
        # Mark task as completed
        now = datetime.datetime.utcnow()
        campaigns.update_one(
            {'id': task_id},
            {
                '$set': {
                    'status': 'completed',
                    'ended_at': now,
                    'reward_given': True,
                    'updated_at': now
                }
            }
        )
        
        # Mark in user_tasks that invite task is completed
        user_tasks.update_one(
            {'user_id': telegram_id},
            {
                '$set': {
                    'invite_task_completed': True,
                    'invite_task_completed_at': now
                }
            },
            upsert=True
        )
        
        # Notify user
        msg = f"✅ Invite Task Completed!\n\nYou earned {reward} CP Coins!"
        try:
            send_open_button_message(telegram_id, msg)
        except:
            send_message(telegram_id, msg)
        
        return jsonify({
            'ok': True,
            'message': 'Task completed!',
            'reward': reward
        })
        
    except Exception as e:
        print(f"Error completing invite task: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/tasks/invite/status', methods=['GET'])
@token_required
def get_invite_task_status():
    """Get user's current invite task status"""
    telegram_id = request.telegram_id
    
    try:
        # Check if task is completed
        task_record = user_tasks.find_one({'user_id': telegram_id})
        is_completed = task_record.get('invite_task_completed', False) if task_record else False
        
        # Check if there's an active invite task
        active_task = campaigns.find_one({
            'user_id': telegram_id,
            'type': 'invite_task',
            'status': {'$in': ['pending_posting', 'active']}
        }, {'_id': 0})
        
        # Convert datetime to ISO strings
        if active_task:
            for field in ['posted_at', 'ended_at', 'created_at', 'updated_at']:
                if field in active_task and active_task[field]:
                    active_task[field] = active_task[field].isoformat()
        
        return jsonify({
            'completed': is_completed,
            'active_task': active_task
        })
    
    except Exception as e:
        print(f"Error getting invite task status: {e}")
        return jsonify({'error': 'Failed to get status'}), 500

# Exchange rate configuration (can be moved to config.py)
STARS_PER_CPC = 1  # 1 Star = 1 CP Coin
CPC_PER_STAR = 1   # 1 CP Coin = 1 Star
MINIMUM_PURCHASE = 100  # Minimum 100 CP Coins

@app.route('/api/purchase/rates', methods=['GET'])
@token_required
def get_exchange_rate():
    """Get the current exchange rate"""
    return jsonify({
        'stars_per_cpc': STARS_PER_CPC,
        'cpc_per_star': CPC_PER_STAR,
        'minimum_purchase': MINIMUM_PURCHASE
    })

@app.route('/api/purchase/stars', methods=['POST'])
@token_required
def initiate_purchase():
    """Initiate a CP Coin purchase with Telegram Stars"""
    telegram_id = request.telegram_id
    data = request.json or {}
    cpc_amount = data.get('cpc_amount')
    
    if not cpc_amount:
        return jsonify({'error': 'CPC amount is required'}), 400
    
    try:
        cpc_amount = int(cpc_amount)
    except ValueError:
        return jsonify({'error': 'Invalid CPC amount'}), 400
    
    # Validate minimum purchase
    if cpc_amount < MINIMUM_PURCHASE:
        return jsonify({'error': f'Minimum purchase is {MINIMUM_PURCHASE} CP Coins'}), 400
    
    try:
        # Calculate stars required
        stars_cost = cpc_amount * STARS_PER_CPC
        
        # Create unique transaction ID
        transaction_id = f"txn_{uuid.uuid4().hex[:16]}"
        
        # Create transaction record
        transaction = {
            'transaction_id': transaction_id,
            'user_id': telegram_id,
            'cpc_amount': cpc_amount,
            'stars_cost': stars_cost,
            'status': 'PENDING',
            'created_at': datetime.datetime.utcnow(),
            'updated_at': datetime.datetime.utcnow()
        }
        
        transactions.insert_one(transaction)
        
        # Generate Telegram Stars invoice
        invoice_result = generate_telegram_invoice(
            telegram_id=telegram_id,
            transaction_id=transaction_id,
            cpc_amount=cpc_amount,
            stars_cost=stars_cost
        )
        
        if not invoice_result.get('ok'):
            # Update transaction as failed
            transactions.update_one(
                {'transaction_id': transaction_id},
                {'$set': {'status': 'FAILED', 'error': 'Failed to generate invoice'}}
            )
            return jsonify({'error': 'Failed to generate invoice'}), 500
        
        # Update transaction with invoice ID
        telegram_invoice_id = invoice_result.get('result', {}).get('message_id')
        payment_url = invoice_result.get('payment_url')
        
        transactions.update_one(
            {'transaction_id': transaction_id},
            {
                '$set': {
                    'telegram_invoice_id': str(telegram_invoice_id),
                    'payment_url': payment_url,
                    'updated_at': datetime.datetime.utcnow()
                }
            }
        )
        
        return jsonify({
            'ok': True,
            'transaction_id': transaction_id,
            'payment_url': payment_url,
            'stars_cost': stars_cost,
            'cpc_amount': cpc_amount
        })
    
    except Exception as e:
        print(f"Error initiating purchase: {e}")
        return jsonify({'error': 'Failed to initiate purchase'}), 500
    
@app.route('/api/telegram/webhook', methods=['POST'])
def telegram_webhook():
    """Handle Telegram payment webhooks"""
    try:
        update = request.json
        
        # Log the update for debugging
        print(f"Received webhook update: {json.dumps(update)}")
        
        # Check if this is a pre-checkout query
        if 'pre_checkout_query' in update:
            pre_checkout_query = update['pre_checkout_query']
            query_id = pre_checkout_query.get('id')
            
            # Always approve (you can add validation here)
            approve_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery"
            http_requests.post(approve_url, json={'pre_checkout_query_id': query_id, 'ok': True})
            
            return jsonify({'ok': True})
        
        # Check if this is a successful payment
        if 'message' in update:
            message = update['message']
            
            if 'successful_payment' in message:
                successful_payment = message['successful_payment']
                
                # Extract payment details
                transaction_id = successful_payment.get('invoice_payload')  # Our transaction ID
                telegram_payment_charge_id = successful_payment.get('telegram_payment_charge_id')
                provider_payment_charge_id = successful_payment.get('provider_payment_charge_id')
                total_amount = successful_payment.get('total_amount')  # In Stars
                currency = successful_payment.get('currency')
                
                telegram_id = str(message.get('from', {}).get('id'))
                
                # Find transaction
                transaction = transactions.find_one({'transaction_id': transaction_id})
                
                if not transaction:
                    print(f"Transaction not found: {transaction_id}")
                    return jsonify({'ok': True})  # Still return ok to Telegram
                
                # Verify transaction belongs to user
                if transaction['user_id'] != telegram_id:
                    print(f"User mismatch for transaction {transaction_id}")
                    return jsonify({'ok': True})
                
                # Check if already processed
                if transaction['status'] == 'SUCCESS':
                    print(f"Transaction already processed: {transaction_id}")
                    return jsonify({'ok': True})
                
                # Update transaction
                transactions.update_one(
                    {'transaction_id': transaction_id},
                    {
                        '$set': {
                            'status': 'SUCCESS',
                            'telegram_payment_charge_id': telegram_payment_charge_id,
                            'provider_payment_charge_id': provider_payment_charge_id,
                            'webhook_timestamp': datetime.datetime.utcnow(),
                            'updated_at': datetime.datetime.utcnow()
                        }
                    }
                )
                
                # Credit user's account
                cpc_amount = transaction['cpc_amount']
                users.update_one(
                    {'telegram_id': telegram_id},
                    {
                        '$inc': {'cpcBalance': cpc_amount},
                        '$set': {'updated_at': datetime.datetime.utcnow()}
                    }
                )
                
                # Notify user
                send_message(
                    telegram_id,
                    f"✅ Payment Successful!\n\n"
                    f"You have received {cpc_amount} CP Coins.\n"
                    f"Transaction ID: {transaction_id}\n\n"
                    f"Thank you for your purchase!"
                )
                
                # Notify admin
                if BOT_ADMIN_CHAT_ID:
                    send_message(
                        BOT_ADMIN_CHAT_ID,
                        f"💰 New Purchase\n\n"
                        f"User: {telegram_id}\n"
                        f"Amount: {cpc_amount} CP\n"
                        f"Stars: {total_amount}\n"
                        f"Transaction: {transaction_id}"
                    )
                
                print(f"Payment processed successfully: {transaction_id}")
                
                return jsonify({'ok': True})
        
        return jsonify({'ok': True})
    
    except Exception as e:
        print(f"Error processing webhook: {e}")
        # Always return ok to Telegram even if we had an error
        # Log the error for debugging
        return jsonify({'ok': True})


@app.route('/api/transactions', methods=['GET'])
@token_required
def get_user_transactions():
    """Get user's transaction history"""
    telegram_id = request.telegram_id
    
    try:
        user_transactions = list(
            transactions.find(
                {'user_id': telegram_id},
                {'_id': 0}
            ).sort('created_at', -1).limit(50)
        )
        
        return jsonify({'transactions': user_transactions})
    
    except Exception as e:
        print(f"Error fetching transactions: {e}")
        return jsonify({'error': 'Failed to fetch transactions'}), 500


@app.route('/api/transactions/<transaction_id>', methods=['GET'])
@token_required
def get_transaction(transaction_id):
    """Get a specific transaction"""
    telegram_id = request.telegram_id
    
    try:
        transaction = transactions.find_one(
            {'transaction_id': transaction_id, 'user_id': telegram_id},
            {'_id': 0}
        )
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        return jsonify(transaction)
    
    except Exception as e:
        print(f"Error fetching transaction: {e}")
        return jsonify({'error': 'Failed to fetch transaction'}), 500

def update_campaign_stats(campaign_id, impressions=0, clicks=0):
    """Update campaign statistics"""
    try:
        campaigns.update_one(
            {'id': campaign_id},
            {
                '$inc': {
                    'impressions': impressions,
                    'clicks': clicks
                },
                '$set': {'updated_at': datetime.datetime.utcnow()}
            }
        )
    except Exception as e:
        print(f"Error updating campaign stats: {e}")
    
@app.route('/api/analytics', methods=['GET'])
@token_required
def get_analytics():
    """Get analytics data for the authenticated user"""
    telegram_id = request.telegram_id
    
    try:
        # Get user's channels
        user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        channel_ids = [ch.get('id') for ch in user_channels]
        
        if not channel_ids:
            # No channels, return zeros
            return jsonify({
                'totalImpressions': 0,
                'engagementRate': 0,
                'newSubscribers': 0
            })
        
        # Calculate total impressions from completed campaigns
        # Impressions = sum of all campaign views from user's channels
        completed_campaigns = list(campaigns.find({
            'status': {'$in': ['completed', 'finished']},
            'toChannelId': {'$in': channel_ids}
        }))
        
        total_impressions = 0
        total_clicks = 0
        
        for campaign in completed_campaigns:
            # Get channel subscribers as proxy for impressions
            channel_id = campaign.get('toChannelId')
            channel = channels.find_one({'id': channel_id})
            if channel:
                subscribers = channel.get('subscribers', 0)
                # Estimate impressions as a percentage of subscribers
                estimated_impressions = int(subscribers * 0.15)  # 15% view rate estimate
                total_impressions += estimated_impressions
                
                # Estimate clicks as a percentage of impressions
                estimated_clicks = int(estimated_impressions * 0.08)  # 8% CTR estimate
                total_clicks += estimated_clicks
        
        # Calculate engagement rate
        engagement_rate = 0
        if total_impressions > 0:
            engagement_rate = round((total_clicks / total_impressions) * 100, 1)
        
        # Calculate new subscribers gained from cross-promos
        # This is an estimate based on successful campaigns
        new_subscribers = 0
        successful_campaigns = campaigns.count_documents({
            'status': {'$in': ['completed', 'finished']},
            'fromChannelId': {'$in': channel_ids}
        })
        
        # Estimate: each successful campaign brings ~20-50 new subscribers
        # This is a rough estimate that should be replaced with actual tracking
        new_subscribers = successful_campaigns * 35  # Average of 35 new subs per campaign
        
        return jsonify({
            'totalImpressions': total_impressions,
            'engagementRate': engagement_rate,
            'newSubscribers': new_subscribers
        })
    
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        return jsonify({'error': 'Failed to fetch analytics'}), 500
    
@app.route('/api/channels/<channel_id>/preview-promo', methods=['POST'])
@token_required
def preview_promo(channel_id):
    """Send a preview of a promo material to the channel owner"""
    telegram_id = request.telegram_id
    data = request.json or {}
    promo_id = data.get('promo_id')
    
    if not promo_id:
        return jsonify({'error': 'Promo ID is required'}), 400
    
    try:
        print(f"[DEBUG] preview_promo called: channel_id={channel_id}, telegram_id={telegram_id}, promo_id={promo_id}")
        # Check if channel exists and belongs to user
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id})
        if not channel:
            # Attempt to fetch channel without owner filter for debugging
            fallback = channels.find_one({'id': channel_id})
            if fallback:
                print(f"[DEBUG] Channel found but owner mismatch. DB owner_id={fallback.get('owner_id')}")
            else:
                print("[DEBUG] Channel not found in database for id:", channel_id)
            return jsonify({'error': 'Channel not found'}), 404
        
        # Find the promo material (support both snake_case and camelCase storage)
        promo_materials = channel.get('promo_materials') or channel.get('promoMaterials') or []
        # If still empty, try normalized view which merges compat fields
        if not promo_materials:
            try:
                normalized = _normalize_channel_for_frontend(channel)
                promo_materials = normalized.get('promos', [])
            except Exception as e:
                print(f"[DEBUG] normalization fallback failed: {e}")

        print(f"[DEBUG] promo_materials count={len(promo_materials)} ids={[p.get('id') for p in promo_materials]}")
        promo = next((p for p in promo_materials if p.get('id') == promo_id), None)
        if not promo:
            print(f"[DEBUG] Promo with id={promo_id} not found for channel={channel_id}")
            return jsonify({'error': 'Promo not found'}), 404
        
        # Send preview to user via bot
        from bot import send_promo_preview
        result = send_promo_preview(
            chat_id=telegram_id,
            promo_name=promo.get('name', 'Untitled'),
            promo_text=promo.get('text', ''),
            promo_link=promo.get('link', ''),
            promo_image=promo.get('image', ''),
            promo_cta=promo.get('cta', 'Learn More')
        )
        
        if result:
            return jsonify({
                'ok': True,
                'message': 'Preview sent to your Telegram!'
            })
        else:
            return jsonify({'error': 'Failed to send preview'}), 500
    
    except Exception as e:
        print(f"Error sending promo preview: {e}")
        return jsonify({'error': 'Failed to send preview'}), 500

#To keep render awake with a cron job pinging the /health endpoint    
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for keeping the service alive"""
    return jsonify({'status': 'ok', 'timestamp': datetime.datetime.utcnow().isoformat()})
    
#API routes for admin functionalities  
@app.route('/api/admin/channels', methods=['GET'])
@token_required
@admin_required
def get_all_channels_admin():
    """Get all channels with owner information (Admin only)"""
    try:
        # Get all channels
        all_channels = list(channels.find({}, {'_id': 0}))
        
        # Get all unique owner IDs
        owner_ids = list(set(ch.get('owner_id') for ch in all_channels if ch.get('owner_id')))
        
        # Fetch owner information
        owners = {}
        for owner_id in owner_ids:
            user = users.find_one({'telegram_id': owner_id}, {'_id': 0})
            if user:
                owners[owner_id] = {
                    'telegram_id': user.get('telegram_id'),
                    'first_name': user.get('first_name', ''),
                    'last_name': user.get('last_name', ''),
                    'username': user.get('username', '')
                }
        
        return jsonify({
            'channels': all_channels,
            'owners': owners
        })
    
    except Exception as e:
        print(f"Error fetching all channels: {e}")
        return jsonify({'error': 'Failed to fetch channels'}), 500


@app.route('/api/admin/channels/<channel_id>/moderate', methods=['POST'])
@token_required
@admin_required
def moderate_channel(channel_id):
    """Approve or reject a channel (Admin only)"""
    data = request.json or {}
    action = data.get('action')  # 'approve' or 'reject'
    reason = data.get('reason', '')
    
    if action not in ['approve', 'reject']:
        return jsonify({'error': 'Invalid action. Must be "approve" or "reject"'}), 400
    
    try:
        # Check if channel exists
        channel = channels.find_one({'id': channel_id})
        
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        # Update channel status
        new_status = 'approved' if action == 'approve' else 'rejected'
        update_data = {
            'status': new_status,
            'moderated_at': datetime.datetime.utcnow(),
            'moderated_by': request.telegram_id,
            'updated_at': datetime.datetime.utcnow()
        }
        
        if reason:
            update_data['moderation_reason'] = reason
        
        channels.update_one(
            {'id': channel_id},
            {'$set': update_data}
        )
        
        # Notify channel owner (try owner first, fall back to admin)
        owner_id = channel.get('owner_id')
        channel_name = channel.get('name', 'Your channel')
        status_text = 'approved' if action == 'approve' else 'rejected'
        message = f"📢 Channel Update\n\n"
        message += f"Your channel '{channel_name}' has been {status_text}.\n"

        if reason:
            message += f"\nReason: {reason}"

        if action == 'approve':
            message += f"\n\n✅ Your channel is now live and visible to other users!"

        try:
            if owner_id:
                # Ensure owner_id is converted to string for Telegram API
                owner_chat_id = str(owner_id)
                try:
                    send_open_button_message(owner_chat_id, message)
                except Exception as e:
                    print(f"Failed to send with button, trying without: {e}")
                    send_message(owner_chat_id, message)
            else:
                # Owner id not available, notify admin
                if BOT_ADMIN_CHAT_ID:
                    send_message(BOT_ADMIN_CHAT_ID, message)
        except Exception as e:
            # Last-resort: notify admin about moderation event
            print(f"Error notifying user of moderation: {e}")
            if BOT_ADMIN_CHAT_ID:
                send_message(BOT_ADMIN_CHAT_ID, f"[Moderation] {channel_name} was {status_text} (failed to notify owner)")

        
        return jsonify({
            'ok': True,
            'message': f'Channel {status_text} successfully',
            'status': new_status
        })
    
    except Exception as e:
        print(f"Error moderating channel: {e}")
        return jsonify({'error': 'Failed to moderate channel'}), 500


@app.route('/api/admin/stats', methods=['GET'])
@token_required
@admin_required
def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        total_channels = channels.count_documents({})
        pending_channels = channels.count_documents({'status': 'pending'})
        approved_channels = channels.count_documents({'status': 'approved'})
        rejected_channels = channels.count_documents({'status': 'rejected'})
        paused_channels = channels.count_documents({'status': 'paused'})
        
        total_users = users.count_documents({})
        total_requests = requests_col.count_documents({})
        total_campaigns = campaigns.count_documents({})
        
        return jsonify({
            'channels': {
                'total': total_channels,
                'pending': pending_channels,
                'approved': approved_channels,
                'rejected': rejected_channels,
                'paused': paused_channels
            },
            'users': total_users,
            'requests': total_requests,
            'campaigns': total_campaigns
        })
    
    except Exception as e:
        print(f"Error fetching admin stats: {e}")
        return jsonify({'error': 'Failed to fetch statistics'}), 500

@app.route('/api/admin/analytics', methods=['GET'])
@token_required
@admin_required
def get_admin_analytics():
    """Get platform-wide analytics (Admin only)"""
    try:
        total_channels = channels.count_documents({'status': 'approved'})
        total_campaigns = campaigns.count_documents({})
        completed_campaigns = campaigns.count_documents({'status': {'$in': ['completed', 'finished']}})
        
        # Total platform impressions
        all_campaigns = list(campaigns.find({'status': {'$in': ['completed', 'finished']}}))
        platform_impressions = sum(c.get('impressions', 0) for c in all_campaigns)
        platform_clicks = sum(c.get('clicks', 0) for c in all_campaigns)
        
        return jsonify({
            'totalChannels': total_channels,
            'totalCampaigns': total_campaigns,
            'completedCampaigns': completed_campaigns,
            'platformImpressions': platform_impressions,
            'platformClicks': platform_clicks
        })
    
    except Exception as e:
        print(f"Error fetching admin analytics: {e}")
        return jsonify({'error': 'Failed to fetch analytics'}), 500

#Reset invite tasks for all users (5000 CP Coins)   
@app.route('/api/admin/reset-invite-task', methods=['POST'])
@token_required
@admin_required
def admin_reset_invite_tasks():
    """Reset invite tasks for all users (Admin only)"""
    try:
        # Reset all users' invite task completion status
        result = user_tasks.update_many(
            {},
            {'$set': {'invite_task_completed': False}}
        )
        
        return jsonify({
            'ok': True,
            'message': f'Invite tasks reset for {result.modified_count} users'
        })
    
    except Exception as e:
        print(f"Error resetting invite tasks: {e}")
        return jsonify({'error': 'Failed to reset invite tasks'}), 500

@app.route('/api/admin/purchases/stats', methods=['GET'])
@token_required
@admin_required
def get_purchase_stats():
    """Get purchase statistics"""
    total_transactions = transactions.count_documents({})
    successful = transactions.count_documents({'status': 'SUCCESS'})
    pending = transactions.count_documents({'status': 'PENDING'})
    failed = transactions.count_documents({'status': 'FAILED'})
    
    # Calculate total revenue
    pipeline = [
        {'$match': {'status': 'SUCCESS'}},
        {'$group': {
            '_id': None,
            'total_cpc': {'$sum': '$cpc_amount'},
            'total_stars': {'$sum': '$stars_cost'}
        }}
    ]
    
    revenue = list(transactions.aggregate(pipeline))
    
    return jsonify({
        'total_transactions': total_transactions,
        'successful': successful,
        'pending': pending,
        'failed': failed,
        'revenue': revenue[0] if revenue else {'total_cpc': 0, 'total_stars': 0}
    })
    
@app.route('/api/admin/campaigns/debug', methods=['GET'])
@token_required
@admin_required
def debug_campaigns():
    """Debug campaign scheduling"""
    now = datetime.datetime.utcnow()
    
    # Get all scheduled campaigns
    scheduled = list(campaigns.find({'status': 'scheduled'}).sort('start_at', 1).limit(10))
    
    # Get recent failed campaigns
    failed = list(campaigns.find({'status': 'failed'}).sort('posted_at', -1).limit(5))
    
    # Get running campaigns
    running = list(campaigns.find({'status': 'running'}).sort('posted_at', -1).limit(5))
    
    return jsonify({
        'current_time': now.isoformat(),
        'scheduled_campaigns': len(scheduled),
        'scheduled_details': [
            {
                'id': str(c.get('id', c.get('_id'))),
                'start_at': c.get('start_at').isoformat() if c.get('start_at') else None,
                'chat_id': c.get('chat_id'),
                'promo_name': c.get('promo', {}).get('name'),
                'time_until_post': (c.get('start_at') - now).total_seconds() / 60 if c.get('start_at') else None
            } for c in scheduled
        ],
        'failed_campaigns': [
            {
                'id': str(c.get('id', c.get('_id'))),
                'error': c.get('error'),
                'chat_id': c.get('chat_id')
            } for c in failed
        ],
        'running_campaigns': len(running)
    })
    
@app.route('/api/admin/test-post/<campaign_id>', methods=['POST'])
@token_required
@admin_required
def test_post_campaign(campaign_id):
    """Test posting a campaign immediately (Admin only)"""
    try:
        camp = campaigns.find_one({'id': campaign_id})
        if not camp:
            return jsonify({'error': 'Campaign not found'}), 404
        
        chat_id = camp.get('chat_id') or camp.get('telegram_chat_id')
        campaign_type = camp.get('type', 'regular')
        
        if not chat_id:
            return jsonify({'error': 'No chat_id in campaign'}), 400
        
        from bot import send_invite_campaign_post, send_campaign_post
        
        if campaign_type == 'invite_task':
            promo_text = camp.get('promo_text', '')
            res = send_invite_campaign_post(chat_id, promo_text, APP_URL)
        else:
            promo = camp.get('promo', {})
            res = send_campaign_post(chat_id, promo)
        
        return jsonify({
            'ok': res.get('ok') if res else False,
            'result': res,
            'chat_id': chat_id,
            'campaign_type': campaign_type
        })
    
    except Exception as e:
        logging.exception('Error in test post')
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    # Initialize database
    ensure_indexes()
    init_mock_partners()
    
    # Always start scheduler
    start_scheduler()
    
    # Local development server
    app.run(host='0.0.0.0', port=5000, debug=True)