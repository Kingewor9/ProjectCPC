from flask import Flask, request, jsonify
from flask_cors import CORS
from models import ensure_indexes, init_mock_partners, upsert_user, partners, requests_col, campaigns, users
from scheduler import start_scheduler, check_and_post_campaigns, cleanup_finished_campaigns
from bot import send_message
from config import STARS_PER_CPC, TELEGRAM_BOT_TOKEN, BOT_ADMIN_CHAT_ID, APP_URL
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
from models import transactions
from urllib.parse import parse_qsl

app = Flask(__name__)
CORS(app)


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
            'description': f'Buy {cpc_amount} CP Coins for use in Growth Guru cross-promotions',
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
        
        # Get user's channels
        user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        
        return jsonify({
            'ok': True,
            'user': {
                **user,
                'channels': user_channels,
                'cpcBalance': user.get('cpcBalance', 0)
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
            
            # Upsert user
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
            
            # Get user's channels
            user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
            
            return jsonify({
                'ok': True,
                'user': {
                    **user,
                    'channels': user_channels,
                    'cpcBalance': user.get('cpcBalance', 0)
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
        # Get user's channels
        user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
        
        # Add channels to user object
        user['channels'] = user_channels
        
        # Add isAdmin flag
        user['isAdmin'] = telegram_id == ADMIN_TELEGRAM_ID
        
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
    return jsonify(demo_user)


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
            
            partner = {
                'id': channel.get('id'),
                'name': channel.get('name'),
                'topic': channel.get('topic'),
                'subs': channel.get('subscribers', 0),
                'lang': channel.get('language', 'en'),
                'avatar': channel.get('avatar', 'https://placehold.co/60x60'),
                'acceptedDays': channel.get('selected_days', []),
                'availableTimeSlots': channel.get('time_slots', []),
                'durationPrices': duration_prices,
                'telegram_chat': channel.get('username', ''),
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
    """Get all approved channels (for discovery)"""
    try:
        # Get all approved channels from the channels collection
        all_channels_raw = list(channels.find({'status': 'approved'}, {'_id': 0}))
        
        # Format channels to match expected structure
        all_channels = []
        for channel in all_channels_raw:
            # Build duration prices from price_settings
            duration_prices = {}
            price_settings = channel.get('price_settings', {})
            for hours, settings in price_settings.items():
                if settings.get('enabled'):
                    duration_prices[hours] = settings.get('price', 0)
            
            formatted_channel = {
                'id': channel.get('id'),
                'name': channel.get('name'),
                'topic': channel.get('topic'),
                'subs': channel.get('subscribers', 0),
                'lang': channel.get('language', 'en'),
                'avatar': channel.get('avatar', 'https://placehold.co/60x60'),
                'acceptedDays': channel.get('selected_days', []),
                'availableTimeSlots': channel.get('time_slots', []),
                'durationPrices': duration_prices,
                'telegram_chat': channel.get('username', ''),
                'xExchanges': 0  # Can calculate if needed
            }
            all_channels.append(formatted_channel)
        
        return jsonify(all_channels)
    
    except Exception as e:
        print(f"Error fetching all channels: {e}")
        return jsonify([])
    
@app.route('/api/requests', methods=['GET'])
def list_requests():
    r = list(requests_col.find({}, {'_id': 0}))
    return jsonify(r)


@app.route('/api/request', methods=['POST'])
def create_request():
    data = request.json
    # expected fields: fromChannelId, toChannelId, daySelected, timeSelected, duration, cpcCost, promo
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
    # notify the recipient (channel owner) via bot if we have chat id stored
    to_owner_chat = None
    # simplistic lookup: find a partner or user channel owner
    # For demo, notify admin
    if BOT_ADMIN_CHAT_ID:
        send_message(BOT_ADMIN_CHAT_ID, f"New cross-promo request from {req['fromChannel']} to {req['toChannel']}")
    return jsonify({'ok': True, 'id': str_id})


@app.route('/api/request/<req_id>/accept', methods=['POST'])
def accept_request(req_id):
    body = request.json or {}
    # mark request accepted, schedule campaign
    # Find by string id field
    req = requests_col.find_one({'id': req_id})
    if not req:
        return jsonify({'error': 'not found'}), 404
    requests_col.update_one({'id': req_id}, {'$set': {'status': 'Accepted', 'accepted_at': datetime.datetime.utcnow()}})

    # schedule campaign (convert selected day/time to next occurrence)
    day = req.get('daySelected', 'Monday')
    time_slot = req.get('timeSelected', '09:00 - 10:00 UTC')
    duration_hours = req.get('duration', 8)
    
    start_at = parse_day_time_to_utc(day, time_slot)
    end_at = calculate_end_time(start_at, duration_hours)
    
    camp = {
        'request_id': req['_id'],
        'chat_id': body.get('chat_id') or BOT_ADMIN_CHAT_ID,
        'promo': req.get('promo'),
        'duration_hours': duration_hours,
        'status': 'scheduled',
        'start_at': start_at,
        'end_at': end_at,
        'created_at': datetime.datetime.utcnow()
    }
    cid = campaigns.insert_one(camp)
    camp_str_id = str(cid.inserted_id)
    campaigns.update_one({'_id': cid.inserted_id}, {'$set': {'id': camp_str_id}})
    # notify requester
    if BOT_ADMIN_CHAT_ID:
        send_message(BOT_ADMIN_CHAT_ID, f"Your request {req_id} was accepted and scheduled.")
    return jsonify({'ok': True, 'campaign_id': camp_str_id})


@app.route('/api/campaigns', methods=['GET'])
def list_campaigns():
    c = list(campaigns.find({}, {'_id': 0}))
    return jsonify(c)

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
        user_channels = list(channels.find({'owner_id': telegram_id}, {'_id': 0}))
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
        
        return jsonify(channel)
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


@app.route('/api/tasks/create-invite', methods=['POST'])
@token_required
def create_invite_task():
    """Create an invite task for a channel"""
    telegram_id = request.telegram_id
    data = request.json or {}
    channel_id = data.get('channel_id')
    
    if not channel_id:
        return jsonify({'error': 'Channel ID is required'}), 400
    
    try:
        # Check if task already completed for this channel
        task_record = user_tasks.find_one({'user_id': telegram_id})
        
        if task_record and task_record.get(f'invite_users_{channel_id}'):
            return jsonify({'error': 'Invite task already completed for this channel'}), 400
        
        # Verify channel belongs to user
        channel = channels.find_one({'id': channel_id, 'owner_id': telegram_id})
        
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404
        
        # Check if channel is active
        if channel.get('status') not in ['approved', 'Active']:
            return jsonify({'error': 'Channel must be active to complete this task'}), 400
        
        # Create a scheduled post
        # We'll use the first available time slot
        time_slots = channel.get('availableTimeSlots', [])
        accepted_days = channel.get('acceptedDays', [])
        
        if not time_slots or not accepted_days:
            return jsonify({'error': 'Channel needs configured time slots and days'}), 400
        
        # Schedule the promotional post
        # For now, we'll schedule it for the next available slot
        from time_utils import parse_day_time_to_utc
        
        # Use the first day and time slot
        day = accepted_days[0]
        time_slot = time_slots[0]
        
        start_at = parse_day_time_to_utc(day, time_slot)
        end_at = start_at + datetime.timedelta(hours=12)
        
        # Create invite campaign
        invite_campaign = {
            'type': 'invite_task',
            'channel_id': channel_id,
            'user_id': telegram_id,
            'telegram_chat_id': channel.get('telegram_id'),
            'status': 'scheduled',
            'start_at': start_at,
            'end_at': end_at,
            'reward': 5000,
            'promo_text': f"🚀 Join CP Gram - The Ultimate Cross-Promotion Platform!\n\n"
                         f"Grow your Telegram channel with strategic cross-promotions.\n\n"
                         f"✅ Connect with similar channels\n"
                         f"✅ Automated posting\n"
                         f"✅ Fair pricing system\n"
                         f"✅ Earn rewards\n\n"
                         f"Start growing today: {APP_URL}",
            'created_at': datetime.datetime.utcnow()
        }
        
        result = campaigns.insert_one(invite_campaign)
        campaign_id = str(result.inserted_id)
        campaigns.update_one({'_id': result.inserted_id}, {'$set': {'id': campaign_id}})
        
        # Mark task as in progress (will be completed when post is deleted)
        user_tasks.update_one(
            {'user_id': telegram_id},
            {
                '$set': {
                    f'invite_users_{channel_id}': True,
                    f'invite_users_{channel_id}_started_at': datetime.datetime.utcnow(),
                    f'invite_campaign_{channel_id}': campaign_id
                }
            },
            upsert=True
        )
        
        # Notify admin
        if BOT_ADMIN_CHAT_ID:
            send_message(
                BOT_ADMIN_CHAT_ID,
                f"📢 Invite task created\n"
                f"User: {telegram_id}\n"
                f"Channel: {channel.get('name')}\n"
                f"Scheduled: {start_at.strftime('%Y-%m-%d %H:%M UTC')}"
            )
        
        return jsonify({
            'ok': True,
            'reward': 5000,
            'campaign_id': campaign_id,
            'message': 'Invite task created successfully!'
        })
    
    except Exception as e:
        print(f"Error creating invite task: {e}")
        return jsonify({'error': 'Failed to create invite task'}), 500

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
            user_id=telegram_id,
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
        
        # Notify channel owner
        owner_id = channel.get('owner_id')
        if owner_id and BOT_ADMIN_CHAT_ID:
            channel_name = channel.get('name', 'Your channel')
            status_text = 'approved' if action == 'approve' else 'rejected'
            message = f"📢 Channel Update\n\n"
            message += f"Your channel '{channel_name}' has been {status_text}.\n"
            
            if reason:
                message += f"\nReason: {reason}"
            
            if action == 'approve':
                message += f"\n\n✅ Your channel is now live and visible to other users!"
            
            # Try to send to owner (if we have their chat_id stored)
            # For now, we'll notify admin
            send_message(BOT_ADMIN_CHAT_ID, message)
        
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
   
@app.route('/api/admin/reset-invite-tasks', methods=['POST'])
@token_required
@admin_required
def reset_invite_tasks():
    """Reset invite tasks for all users"""
    user_tasks.update_many(
        {},
        {'$set': {'invite_users': False}}
    )
    return jsonify({'ok': True, 'message': 'Invite tasks reset for all users'})

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
    
if __name__ == '__main__':
    # Initialize database
    ensure_indexes()
    init_mock_partners()
    
    # Only run scheduler locally
    import os
    if os.getenv('RENDER') != 'true':
        start_scheduler()
    
    # Local development server
    app.run(host='0.0.0.0', port=5000, debug=True)