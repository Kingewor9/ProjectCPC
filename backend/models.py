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