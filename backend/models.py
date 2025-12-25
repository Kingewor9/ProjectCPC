from pymongo import MongoClient
from config import MONGO_URI
import requests
import datetime
import uuid

client = MongoClient(MONGO_URI)
db = client.get_default_database()

# Collections
users = db.users
partners = db.partners
requests_col = db.requests
campaigns = db.campaigns
channels = db.channels
user_tasks = db.user_tasks
transactions = db.transactions


def ensure_indexes():
    users.create_index('telegram_id', unique=True)
    partners.create_index('id', unique=True)
    requests_col.create_index('status')
    campaigns.create_index('status')
    channels.create_index('id', unique=True)
    channels.create_index('owner_id')
    channels.create_index('status')
    user_tasks.create_index('telegram_id', unique=True)
    transactions.create_index('transaction_id', unique=True)
    transactions.create_index('telegram_id')
    transactions.create_index('status')


def init_mock_partners():
    # If partners empty, seed from minimal mock data similar to frontend
    if partners.count_documents({}) == 0:
        mock = [
            {
                'id': 'p1', 'name': 'Daily Motivation', 'topic': 'Quotes', 'subs': 8200,
                'lang': 'English', 'xExchanges': 22, 'avatar': 'https://placehold.co/40x40/000/fff?text=DM',
                'acceptedDays': ['Monday','Wednesday','Friday'],
                'availableTimeSlots': ['08:00 - 09:00 UTC','14:00 - 15:00 UTC'],
                'durationPrices': { '2': 100, '4': 0, '6': 250, '12': 500 },
                'telegram_chat': '@daily_motivation',
                'telegram_user_id': None,
            },
            {
                'id': 'p3', 'name': 'Latest Ethereum News', 'topic': 'Crypto News', 'subs': 35000,
                'lang': 'English', 'xExchanges': 120, 'avatar': 'https://placehold.co/40x40/000/fff?text=EN',
                'acceptedDays': ['Monday','Tuesday','Wednesday','Thursday','Friday'],
                'availableTimeSlots': ['09:00 - 10:00 UTC','11:00 - 12:00 UTC'],
                'durationPrices': { '2': 50, '4': 100, '6':150, '8':200, '12':300 },
                'telegram_chat': '@eth_news_channel',
                'telegram_user_id': None,
            }
        ]
        partners.insert_many(mock)


def upsert_user(telegram_user):
    # telegram_user: dict with keys: id, first_name, last_name, username, photo_url
    from config import ADMIN_TELEGRAM_ID
    
    telegram_id = telegram_user['id']
    # Set isAdmin based on ADMIN_TELEGRAM_ID
    telegram_user['isAdmin'] = str(telegram_id) == str(ADMIN_TELEGRAM_ID)
    
    users.update_one({'telegram_id': telegram_id}, {'$set': telegram_user, '$setOnInsert': {'created_at': datetime.datetime.utcnow()}}, upsert=True)
    return users.find_one({'telegram_id': telegram_id}, {'_id': 0})

def get_telegram_file_id_from_chat(chat_id, bot_token):
    """
    Get the file_id of a channel's profile photo.
    This is preferable to storing URLs since file_ids don't expire.
    Returns tuple: (file_id, telegram_id) or (None, None) if no photo
    """
    try:
        api_url = f"https://api.telegram.org/bot{bot_token}/getChat"
        response = requests.get(api_url, params={'chat_id': chat_id}, timeout=10)
        
        if response.status_code != 200:
            return None, None
        
        data = response.json()
        if not data.get('ok'):
            return None, None
        
        chat = data.get('result', {})
        
        if chat.get('photo'):
            file_id = chat['photo'].get('big_file_id') or chat['photo'].get('small_file_id')
            telegram_id = str(chat.get('id'))
            return file_id, telegram_id
        
        return None, str(chat.get('id'))
    except Exception as e:
        print(f"Error getting Telegram file_id: {e}")
        return None, None


def get_telegram_file_url_from_file_id(file_id, bot_token):
    """
    Convert a Telegram file_id to a download URL.
    This function is called on-demand to ensure we always have fresh URLs.
    """
    try:
        file_url = f"https://api.telegram.org/bot{bot_token}/getFile"
        file_response = requests.get(file_url, params={'file_id': file_id}, timeout=10)
        
        if file_response.status_code == 200:
            file_data = file_response.json()
            if file_data.get('ok'):
                file_path = file_data['result'].get('file_path')
                return f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        
        return None
    except Exception as e:
        print(f"Error getting Telegram file URL: {e}")
        return None


def refresh_channel_subscribers_from_telegram(telegram_id, bot_token):
    """
    Fetch the current subscriber count from Telegram API for a channel.
    Returns the current subscriber count or None if fetch fails.
    """
    try:
        api_url = f"https://api.telegram.org/bot{bot_token}/getChatMemberCount"
        response = requests.get(api_url, params={'chat_id': telegram_id}, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                return data.get('result', 0)
        
        return None
    except Exception as e:
        print(f"Error refreshing channel subscribers: {e}")
        return None


def validate_channel_with_telegram(username, bot_token):
    """
    Validate a Telegram channel using the Bot API
    Returns channel info if valid, None if invalid
    """
    try:
        # Try to get chat info using getChat method
        # The username should start with @ for the API
        chat_username = f"@{username}" if not username.startswith('@') else username
        
        api_url = f"https://api.telegram.org/bot{bot_token}/getChat"
        response = requests.get(api_url, params={'chat_id': chat_username}, timeout=10)
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        
        if not data.get('ok'):
            return None
        
        chat = data.get('result', {})
        
        # Verify it's a channel (not a group or private chat)
        if chat.get('type') not in ['channel', 'supergroup']:
            return None
        
        # Get member count
        member_count_url = f"https://api.telegram.org/bot{bot_token}/getChatMemberCount"
        member_response = requests.get(member_count_url, params={'chat_id': chat.get('id')}, timeout=10)
        
        subscribers = 0
        if member_response.status_code == 200:
            member_data = member_response.json()
            if member_data.get('ok'):
                subscribers = member_data.get('result', 0)
        
        # Get channel photo - store file_id instead of direct URL
        avatar = 'https://placehold.co/100x100/0078d4/FFFFFF?font=inter&text=CH'
        avatar_file_id = None
        if chat.get('photo'):
            # Get the file path for the photo
            file_id = chat['photo'].get('big_file_id') or chat['photo'].get('small_file_id')
            if file_id:
                avatar_file_id = file_id
                # Generate fresh URL from file_id
                file_url = get_telegram_file_url_from_file_id(file_id, bot_token)
                if file_url:
                    avatar = file_url
        
        # Extract language from description or default to English
        language = 'English'  # Default
        description = chat.get('description', '')
        # You could add language detection logic here if needed
        
        # Note: Telegram API doesn't provide 24h view statistics
        # This would require a separate analytics bot running in the channel
        # For now, we'll estimate it as a percentage of subscribers
        avg_views_24h = int(subscribers * 0.15)  # Estimate 15% engagement
        
        return {
            'name': chat.get('title', 'Unknown Channel'),
            'username': chat.get('username', username),
            'avatar': avatar,
            'avatar_file_id': avatar_file_id,  # Store file_id for later refresh
            'subscribers': subscribers,
            'avgViews24h': avg_views_24h,
            'language': language,
            'telegram_id': str(chat.get('id'))
        }
    
    except requests.RequestException as e:
        print(f"Error validating channel with Telegram: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None


def add_user_channel(telegram_id, channel_info, topic, selected_days, promos_per_day, 
                     price_settings, time_slots, promo_materials):
    """
    Add a new channel to the database
    Returns the channel ID
    """
    channel_id = f"ch_{uuid.uuid4().hex[:12]}"
    
    # Build duration prices dict (only enabled ones)
    duration_prices = {}
    for hours, settings in price_settings.items():
        if settings.get('enabled'):
            duration_prices[hours] = settings.get('price', 0)
    
    channel_doc = {
        'id': channel_id,
        'owner_id': telegram_id,
        'name': channel_info.get('name'),
        'username': channel_info.get('username'),
        'telegram_id': channel_info.get('telegram_id'),
        'avatar': channel_info.get('avatar'),
        'avatar_file_id': channel_info.get('avatar_file_id'),  # Store file_id for refresh
        'subscribers': channel_info.get('subscribers', 0),
        'avgViews24h': channel_info.get('avgViews24h', 0),
        'language': channel_info.get('language', 'English'),
        'topic': topic,
        'selected_days': selected_days,
        'promos_per_day': promos_per_day,
        'price_settings': price_settings,
        'time_slots': time_slots,
        'promo_materials': promo_materials,
        'status': 'pending',  # pending, approved, rejected
        'is_paused': False,  # User pause control - approved channels show as active only if not paused
        'xExchanges': 0,  # Count of completed exchanges
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    channels.insert_one(channel_doc)
    return channel_id


def get_user_channels_list(telegram_id):
    """
    Get all channels for a specific user
    """
    return list(channels.find({'owner_id': telegram_id}, {'_id': 0}))

def get_channel_by_id(channel_id, telegram_id=None):
    """
    Get a specific channel by ID
    Optionally filter by telegram_id to ensure ownership
    """
    query = {'id': channel_id}
    if telegram_id:
        query['owner_id'] = telegram_id
    
    return channels.find_one(query, {'_id': 0})


def update_channel_status(channel_id, status):
    """
    Update channel status (pending, approved, rejected)
    """
    channels.update_one(
        {'id': channel_id},
        {'$set': {'status': status, 'updated_at': datetime.datetime.utcnow()}}
    )


def increment_channel_exchanges(channel_id):
    """
    Increment the exchange counter for a channel
    """
    channels.update_one(
        {'id': channel_id},
        {'$inc': {'xExchanges': 1}, '$set': {'updated_at': datetime.datetime.utcnow()}}
    )
    
def create_manual_campaign(request_id, from_channel_id, to_channel_id, promo, 
                           scheduled_start, scheduled_end, duration_hours, user_role):
    """
    Create a campaign with manual posting workflow
    
    Args:
        request_id: Original cross-promo request ID
        from_channel_id: Requester's channel ID
        to_channel_id: Acceptor's channel ID
        promo: Promo material to be posted
        scheduled_start: Originally scheduled start time
        scheduled_end: Originally scheduled end time
        duration_hours: Campaign duration
        user_role: 'requester' or 'acceptor' - who will post this promo
    
    Returns:
        Campaign ID
    """
    campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
    
    campaign_doc = {
        'id': campaign_id,
        'request_id': request_id,
        'fromChannelId': from_channel_id,
        'toChannelId': to_channel_id,
        'promo': promo,
        'duration_hours': duration_hours,
        'user_role': user_role,
        
        # Status starts as pending_posting
        'status': 'pending_posting',
        
        # Scheduled times (for reference)
        'scheduled_start_at': scheduled_start,
        'scheduled_end_at': scheduled_end,
        
        # Actual times (set later by user)
        'actual_start_at': None,
        'actual_end_at': None,
        
        # Verification
        'post_verification_link': None,
        'partner_verified': False,
        'partner_posted': False,
        
        # Metadata
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    campaigns.insert_one(campaign_doc)
    return campaign_id

def create_single_manual_campaign(request_id, from_channel_id, to_channel_id, 
                                  requester_promo, acceptor_promo, duration_hours, cpc_cost):
    """
    Create a single campaign that tracks both users independently
    
    Args:
        request_id: Original cross-promo request ID (ObjectId or string)
        from_channel_id: Requester's channel ID
        to_channel_id: Acceptor's channel ID
        requester_promo: Promo from requester (to be posted by acceptor)
        acceptor_promo: Promo from acceptor (to be posted by requester)
        duration_hours: Campaign duration
        cpc_cost: Cost that will be transferred from requester to acceptor
    
    Returns:
        Campaign ID
    """
    campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
    
    # Convert ObjectId to string if necessary
    request_id_str = str(request_id) if request_id else None
    
    campaign_doc = {
        'id': campaign_id,
        'request_id_str': request_id_str,  # Store as string to avoid ObjectId issues
        'fromChannelId': from_channel_id,
        'toChannelId': to_channel_id,
        'duration_hours': duration_hours,
        'cpc_cost': cpc_cost,
        
        # Promos for both sides
        'requester_promo': requester_promo,  # Acceptor posts this
        'acceptor_promo': acceptor_promo,    # Requester posts this
        
        # Requester tracking
        'requester_status': 'pending_posting',
        'requester_post_link': None,
        'requester_posted_at': None,
        'requester_ended_at': None,
        'requester_reward_given': False,
        
        # Acceptor tracking
        'acceptor_status': 'pending_posting',
        'acceptor_post_link': None,
        'acceptor_posted_at': None,
        'acceptor_ended_at': None,
        'acceptor_reward_given': False,
        
        # Metadata
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    campaigns.insert_one(campaign_doc)
    return campaign_id

def get_user_campaigns(telegram_id):
    """
    Get all campaigns for channels owned by the user
    """
    # Get user's channel IDs
    user_channels = list(channels.find({'owner_id': telegram_id}, {'id': 1, '_id': 0}))
    channel_ids = [ch['id'] for ch in user_channels]
    
    if not channel_ids:
        return []
    
    # Get campaigns where user is either sender or receiver - EXCLUDE _id
    user_campaigns = list(campaigns.find({
        '$or': [
            {'fromChannelId': {'$in': channel_ids}},
            {'toChannelId': {'$in': channel_ids}}
        ]
    }, {'_id': 0}))
    
    # Determine user_role and get user-specific data for each campaign
    for campaign in user_campaigns:
        from_id = campaign.get('fromChannelId')
        to_id = campaign.get('toChannelId')
        
        if from_id in channel_ids:
            # User is the requester
            campaign['user_role'] = 'requester'
            campaign['status'] = campaign.get('requester_status', 'pending_posting')
            campaign['promo'] = campaign.get('acceptor_promo', {})  # Requester posts acceptor's promo
            campaign['post_verification_link'] = campaign.get('requester_post_link')
            campaign['actual_start_at'] = campaign.get('requester_posted_at')
            campaign['actual_end_at'] = campaign.get('requester_ended_at')
            
            # Get partner channel name
            partner_ch = channels.find_one({'id': to_id}, {'name': 1, '_id': 0})
            if partner_ch:
                campaign['partner_channel_name'] = partner_ch.get('name')
        else:
            # User is the acceptor
            campaign['user_role'] = 'acceptor'
            campaign['status'] = campaign.get('acceptor_status', 'pending_posting')
            campaign['promo'] = campaign.get('requester_promo', {})  # Acceptor posts requester's promo
            campaign['post_verification_link'] = campaign.get('acceptor_post_link')
            campaign['actual_start_at'] = campaign.get('acceptor_posted_at')
            campaign['actual_end_at'] = campaign.get('acceptor_ended_at')
            
            # Get partner channel name
            partner_ch = channels.find_one({'id': from_id}, {'name': 1, '_id': 0})
            if partner_ch:
                campaign['partner_channel_name'] = partner_ch.get('name')
    
    return user_campaigns

def verify_and_start_user_campaign(campaign_id, telegram_id, post_link):
    """
    User submits their post link and starts their side of the campaign immediately
    """
    campaign = campaigns.find_one({'id': campaign_id})
    if not campaign:
        return {'error': 'Campaign not found'}
    
    # Determine if user is requester or acceptor
    from_channel = channels.find_one({'id': campaign.get('fromChannelId')})
    to_channel = channels.find_one({'id': campaign.get('toChannelId')})
    
    is_requester = from_channel and from_channel.get('owner_id') == telegram_id
    
    now = datetime.datetime.utcnow()
    
    if is_requester:
        # Update requester's side
        campaigns.update_one(
            {'id': campaign_id},
            {
                '$set': {
                    'requester_status': 'active',
                    'requester_post_link': post_link,
                    'requester_posted_at': now,
                    'updated_at': now
                }
            }
        )
    else:
        # Update acceptor's side
        campaigns.update_one(
            {'id': campaign_id},
            {
                '$set': {
                    'acceptor_status': 'active',
                    'acceptor_post_link': post_link,
                    'acceptor_posted_at': now,
                    'updated_at': now
                }
            }
        )
    
    return {'ok': True}

def end_user_campaign_and_reward(campaign_id, telegram_id):
    """
    End user's side of campaign and distribute their reward
    Returns dict with reward info
    """
    campaign = campaigns.find_one({'id': campaign_id})
    if not campaign:
        return {'error': 'Campaign not found'}
    
    # Get channel IDs
    from_channel_id = campaign.get('fromChannelId')
    to_channel_id = campaign.get('toChannelId')
    
    # Get channel owners
    from_channel = channels.find_one({'id': from_channel_id})
    to_channel = channels.find_one({'id': to_channel_id})
    
    if not from_channel or not to_channel:
        return {'error': 'Channels not found'}
    
    requester_id = from_channel.get('owner_id')
    acceptor_id = to_channel.get('owner_id')
    cpc_cost = campaign.get('cpc_cost', 0)
    
    is_requester = telegram_id == requester_id
    now = datetime.datetime.utcnow()
    
    if is_requester:
        # Check if already rewarded
        if campaign.get('requester_reward_given'):
            return {'error': 'Reward already claimed'}
        
        # Requester gets 150 CP bonus
        requester_bonus = 150
        users.update_one(
            {'telegram_id': requester_id},
            {'$inc': {'cpcBalance': requester_bonus}}
        )
        
        # Mark requester side as completed
        campaigns.update_one(
            {'id': campaign_id},
            {
                '$set': {
                    'requester_status': 'completed',
                    'requester_ended_at': now,
                    'requester_reward_given': True,
                    'updated_at': now
                }
            }
        )
        
        # Increment exchange counter for requester's channel
        increment_channel_exchanges(from_channel_id)
        
        return {
            'ok': True,
            'reward': requester_bonus,
            'role': 'requester'
        }
    else:
        # Check if already rewarded
        if campaign.get('acceptor_reward_given'):
            return {'error': 'Reward already claimed'}
        
        # Acceptor gets full CPC cost
        # Deduct from requester, add to acceptor
        users.update_one(
            {'telegram_id': requester_id},
            {'$inc': {'cpcBalance': -cpc_cost}}
        )
        
        users.update_one(
            {'telegram_id': acceptor_id},
            {'$inc': {'cpcBalance': cpc_cost}}
        )
        
        # Mark acceptor side as completed
        campaigns.update_one(
            {'id': campaign_id},
            {
                '$set': {
                    'acceptor_status': 'completed',
                    'acceptor_ended_at': now,
                    'acceptor_reward_given': True,
                    'updated_at': now
                }
            }
        )
        
        # Increment exchange counter for acceptor's channel
        increment_channel_exchanges(to_channel_id)
        
        return {
            'ok': True,
            'reward': cpc_cost,
            'role': 'acceptor'
        }