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
ad_rewards = db.ad_rewards


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
    ad_rewards.create_index('user_id')
    ad_rewards.create_index('timestamp')


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
    
#To detect channel languages
def detect_language_from_text(text):
    """
    Detect language from text using character patterns and common words.
    Returns language name (e.g., 'English', 'Russian', 'Arabic', etc.)
    """
    if not text or len(text.strip()) < 10:
        return 'English'  # Default fallback
    
    text = text.lower()
    
    # Count character types
    cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    arabic_count = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    chinese_count = sum(1 for c in text if '\u4E00' <= c <= '\u9FFF')
    korean_count = sum(1 for c in text if '\uAC00' <= c <= '\uD7AF')
    hebrew_count = sum(1 for c in text if '\u0590' <= c <= '\u05FF')
    thai_count = sum(1 for c in text if '\u0E00' <= c <= '\u0E7F')
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    
    total_chars = len([c for c in text if c.isalpha()])
    
    if total_chars == 0:
        return 'English'
    
    # Calculate percentages
    cyrillic_percent = (cyrillic_count / total_chars) * 100
    arabic_percent = (arabic_count / total_chars) * 100
    chinese_percent = (chinese_count / total_chars) * 100
    korean_percent = (korean_count / total_chars) * 100
    hebrew_percent = (hebrew_count / total_chars) * 100
    thai_percent = (thai_count / total_chars) * 100
    devanagari_percent = (devanagari_count / total_chars) * 100
    
    # Detect based on character frequency (threshold: 30%)
    if cyrillic_percent > 30:
        return 'Russian'
    elif arabic_percent > 30:
        return 'Arabic'
    elif chinese_percent > 30:
        return 'Chinese'
    elif korean_percent > 30:
        return 'Korean'
    elif hebrew_percent > 30:
        return 'Hebrew'
    elif thai_percent > 30:
        return 'Thai'
    elif devanagari_percent > 30:
        return 'Hindi'
    
    # Check for common language-specific words
    # Spanish
    spanish_words = ['el', 'la', 'de', 'en', 'que', 'es', 'por', 'con', 'para', 'una', 'como']
    spanish_matches = sum(1 for word in spanish_words if f' {word} ' in f' {text} ')
    
    # French
    french_words = ['le', 'la', 'de', 'et', 'est', 'un', 'une', 'dans', 'pour', 'qui', 'avec']
    french_matches = sum(1 for word in french_words if f' {word} ' in f' {text} ')
    
    # German
    german_words = ['der', 'die', 'das', 'und', 'in', 'ist', 'den', 'von', 'zu', 'mit', 'auf']
    german_matches = sum(1 for word in german_words if f' {word} ' in f' {text} ')
    
    # Portuguese
    portuguese_words = ['o', 'a', 'de', 'e', 'é', 'do', 'da', 'em', 'um', 'para', 'com']
    portuguese_matches = sum(1 for word in portuguese_words if f' {word} ' in f' {text} ')
    
    # Italian
    italian_words = ['il', 'di', 'e', 'la', 'per', 'un', 'è', 'in', 'che', 'non', 'con']
    italian_matches = sum(1 for word in italian_words if f' {word} ' in f' {text} ')
    
    # Turkish
    turkish_words = ['bir', 've', 'bu', 'için', 'ile', 'da', 'de', 'mi', 'var', 'olan']
    turkish_matches = sum(1 for word in turkish_words if f' {word} ' in f' {text} ')
    
    # Find language with most matches (minimum 3 matches required)
    language_scores = {
        'Spanish': spanish_matches,
        'French': french_matches,
        'German': german_matches,
        'Portuguese': portuguese_matches,
        'Italian': italian_matches,
        'Turkish': turkish_matches
    }
    
    max_lang = max(language_scores, key=language_scores.get)
    if language_scores[max_lang] >= 3:
        return max_lang
    
    # Default to English if no clear detection
    return 'English'

def validate_channel_with_telegram(username, bot_token):
    """
    Validate a Telegram channel using the Bot API
    Supports both public and private channels
    Returns channel info if valid, None if invalid
    """
    try:
        # Try to get chat info using getChat method
        # The username should start with @ for public channels
        # For private channels, user must provide the numeric chat ID
        chat_identifier = username
        
        # Clean up the identifier
        if chat_identifier.startswith('@'):
            chat_username = chat_identifier
        elif chat_identifier.startswith('https://t.me/'):
            # Extract username from URL
            chat_username = '@' + chat_identifier.replace('https://t.me/', '').replace('http://t.me/', '')
        elif chat_identifier.startswith('-100'):
            # This is a private channel ID (starts with -100)
            chat_username = chat_identifier
        elif chat_identifier.isdigit() or (chat_identifier.startswith('-') and chat_identifier[1:].isdigit()):
            # Numeric chat ID
            chat_username = chat_identifier
        else:
            # Assume it's a username without @
            chat_username = f"@{chat_identifier}"
        
        api_url = f"https://api.telegram.org/bot{bot_token}/getChat"
        response = requests.get(api_url, params={'chat_id': chat_username}, timeout=10)
        
        if response.status_code != 200:
            # If public channel validation failed, return helpful error
            return {
                'error': 'unable_to_access',
                'message': 'Unable to access channel. For private channels, please add @cp_grambot as admin first.',
                'is_private_channel_error': True
            }
        
        data = response.json()
        
        if not data.get('ok'):
            error_description = data.get('description', '')
            
            # Check if error is due to bot not being a member
            if 'bot is not a member' in error_description.lower() or 'chat not found' in error_description.lower():
                return {
                    'error': 'bot_not_admin',
                    'message': 'This appears to be a private channel. Please add @cp_grambot as an admin to your channel first, then try again.',
                    'is_private_channel_error': True
                }
            
            return {
                'error': 'validation_failed',
                'message': f'Validation failed: {error_description}',
                'is_private_channel_error': False
            }
        
        chat = data.get('result', {})
        
        # Verify it's a channel (not a group or private chat)
        chat_type = chat.get('type')
        if chat_type not in ['channel', 'supergroup']:
            return {
                'error': 'not_a_channel',
                'message': f'This is a {chat_type}, not a channel. Only channels are supported.',
                'is_private_channel_error': False
            }
        
        # Check if bot is an admin (required for private channels)
        chat_id = chat.get('id')
        bot_username = bot_token.split(':')[0]
        
        admin_check_url = f"https://api.telegram.org/bot{bot_token}/getChatMember"
        admin_response = requests.get(
            admin_check_url,
            params={
                'chat_id': chat_id,
                'user_id': bot_username  # Bot's user ID
            },
            timeout=10
        )
        
        is_admin = False
        if admin_response.status_code == 200:
            admin_data = admin_response.json()
            if admin_data.get('ok'):
                member_status = admin_data.get('result', {}).get('status')
                is_admin = member_status in ['administrator', 'creator']
        
        # For private channels, bot MUST be admin
        is_private = chat.get('username') is None
        if is_private and not is_admin:
            return {
                'error': 'bot_not_admin',
                'message': 'Bot must be an admin of private channels. Please add @cp_grambot as an admin first.',
                'is_private_channel_error': True
            }
        
        # Get member count
        member_count_url = f"https://api.telegram.org/bot{bot_token}/getChatMemberCount"
        member_response = requests.get(member_count_url, params={'chat_id': chat_id}, timeout=10)
        
        subscribers = 0
        if member_response.status_code == 200:
            member_data = member_response.json()
            if member_data.get('ok'):
                subscribers = member_data.get('result', 0)
        
        # Get channel photo - store file_id instead of direct URL
        avatar = 'https://placehold.co/100x100/0078d4/FFFFFF?font=inter&text=CH'
        avatar_file_id = None
        if chat.get('photo'):
            file_id = chat['photo'].get('big_file_id') or chat['photo'].get('small_file_id')
            if file_id:
                avatar_file_id = file_id
                # Generate fresh URL from file_id
                file_url = get_telegram_file_url_from_file_id(file_id, bot_token)
                if file_url:
                    avatar = file_url
        
       # **IMPROVED LANGUAGE DETECTION**
        # Try multiple methods to detect language accurately
        
        language = 'English'  # Default
        
        # Method 1: Check channel description
        description = chat.get('description', '')
        if description and len(description) >= 20:
            detected_lang = detect_language_from_text(description)
            if detected_lang != 'English':
                language = detected_lang
        
        # Method 2: If description didn't help, fetch recent messages
        if language == 'English' and description:
            # Try to get recent messages to better detect language
            try:
                messages_url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
                messages_response = requests.get(messages_url, params={'chat_id': chat_id, 'limit': 10}, timeout=10)
                
                if messages_response.status_code == 200:
                    messages_data = messages_response.json()
                    if messages_data.get('ok'):
                        # Collect text from recent messages
                        message_texts = []
                        for update in messages_data.get('result', []):
                            if 'channel_post' in update:
                                text = update['channel_post'].get('text', '')
                                if text:
                                    message_texts.append(text)
                        
                        # Combine messages and detect language
                        if message_texts:
                            combined_text = ' '.join(message_texts[:5])  # Use first 5 messages
                            detected_lang = detect_language_from_text(combined_text)
                            if detected_lang != 'English':
                                language = detected_lang
            except Exception as e:
                print(f"Error fetching messages for language detection: {e}")
        
        # Method 3: Use channel title if still no detection
        if language == 'English':
            title = chat.get('title', '')
            if title:
                detected_lang = detect_language_from_text(title)
                language = detected_lang
                
        # Estimate 24h views
        avg_views_24h = int(subscribers * 0.15)
        
        # For private channels, generate a display username
        display_username = chat.get('username')
        if not display_username:
            # Private channel - use channel name
            display_username = f"Private_{chat.get('title', 'Channel')[:20].replace(' ', '_')}"
        
        return {
            'name': chat.get('title', 'Unknown Channel'),
            'username': display_username,
            'avatar': avatar,
            'avatar_file_id': avatar_file_id,
            'subscribers': subscribers,
            'avgViews24h': avg_views_24h,
            'language': language,
            'telegram_id': str(chat_id),
            'is_private': is_private,
            'bot_is_admin': is_admin
        }
    
    except requests.Timeout:
        return {
            'error': 'timeout',
            'message': 'Request timed out. Please try again.',
            'is_private_channel_error': False
        }
    except requests.RequestException as e:
        print(f"Error validating channel with Telegram: {e}")
        return {
            'error': 'request_error',
            'message': 'Network error occurred. Please check your connection and try again.',
            'is_private_channel_error': False
        }
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            'error': 'unexpected_error',
            'message': 'An unexpected error occurred. Please try again.',
            'is_private_channel_error': False
        }

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
    
      # Set 48-hour deadline for posting
    now = datetime.datetime.utcnow()
    posting_deadline = now + datetime.timedelta(hours=48)
    
    campaign_doc = {
        'id': campaign_id,
        'request_id_str': request_id_str,  # Store as string to avoid ObjectId issues
        'fromChannelId': from_channel_id,
        'toChannelId': to_channel_id,
        'duration_hours': duration_hours,
        'cpc_cost': cpc_cost,
        
        # 48-hour posting deadline
        'posting_deadline': posting_deadline,
        
        # Promos for both sides
        'requester_promo': requester_promo,  # Acceptor posts this
        'acceptor_promo': acceptor_promo,    # Requester posts this
        
        # Requester tracking
        'requester_status': 'pending_posting',
        'requester_post_link': None,
        'requester_posted_at': None,
        'requester_ended_at': None,
        'requester_reward_given': False,
        'requester_deadline_notified': False,  # For expiry notification
        
        
        # Acceptor tracking
        'acceptor_status': 'pending_posting',
        'acceptor_post_link': None,
        'acceptor_posted_at': None,
        'acceptor_ended_at': None,
        'acceptor_reward_given': False,
        'acceptor_deadline_notified': False,  # For expiry notification
        
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
    
     # ADDED: Check and expire campaigns before fetching
    check_and_expire_campaigns()
    
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
        #Acceptor's side
        # Check if already rewarded
        if campaign.get('acceptor_reward_given'):
            return {'error': 'Reward already claimed'}
        
        # Verify requester has enough balance BEFORE deducting
        requester_user = users.find_one({'telegram_id': requester_id})
        if not requester_user:
            return {'error': 'Requester not found'}
        
        requester_balance = requester_user.get('cpcBalance', 0)
        if requester_balance < cpc_cost:
            # This shouldn't happen if validation worked, but safety check
            return {
                'error': f'Requester has insufficient balance. Required: {cpc_cost}, Available: {requester_balance}'
            }
        
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
        
def check_and_expire_campaigns():
    """
    Check all pending campaigns and expire ONLY the user's side that failed to post.
    Each side is independent - if requester posts but acceptor doesn't, only acceptor gets penalized.
    Deduct 250 CP coins from users who failed to post within deadline.
    """
    from config import TELEGRAM_BOT_TOKEN
    from bot import send_message
    
    now = datetime.datetime.utcnow()
    
    # Find all campaigns that have passed their deadline
    expired_campaigns = campaigns.find({
        'posting_deadline': {'$lt': now},
        '$or': [
            {'requester_status': 'pending_posting'},
            {'acceptor_status': 'pending_posting'}
        ]
    })
    
    for campaign in expired_campaigns:
        campaign_id = campaign.get('id')
        from_channel_id = campaign.get('fromChannelId')
        to_channel_id = campaign.get('toChannelId')
        
        # Get channel owners
        from_channel = channels.find_one({'id': from_channel_id})
        to_channel = channels.find_one({'id': to_channel_id})
        
        if not from_channel or not to_channel:
            continue
        
        requester_id = from_channel.get('owner_id')
        acceptor_id = to_channel.get('owner_id')
        
        requester_status = campaign.get('requester_status')
        acceptor_status = campaign.get('acceptor_status')
        
        penalty = 250  # CP coins penalty
        
        # INDEPENDENT EXPIRATION: Handle requester side ONLY if they failed
        if requester_status == 'pending_posting':
            # Check requester's balance before deducting
            requester_user = users.find_one({'telegram_id': requester_id})
            if requester_user:
                current_balance = requester_user.get('cpcBalance', 0)
                # Deduct penalty (can go negative)
                users.update_one(
                    {'telegram_id': requester_id},
                    {
                        '$inc': {'cpcBalance': -penalty},
                        '$set': {'updated_at': now}
                    }
                )
                
                # Update ONLY requester's status to expired
                campaigns.update_one(
                    {'id': campaign_id},
                    {
                        '$set': {
                            'requester_status': 'expired',
                            'requester_expired_at': now,
                            'updated_at': now
                        }
                    }
                )
                
                # Notify requester
                try:
                    send_message(
                        requester_id,
                        f"⚠️ Your Campaign Expired!\n\n"
                        f"You failed to post your cross-promo within 48 hours.\n"
                        f"Penalty: -{penalty} CP Coins deducted from your balance.\n\n"
                        f"Partner: {to_channel.get('name')}\n\n"
                        f"Note: Your partner's campaign will continue if they posted on time."
                    )
                except Exception as e:
                    print(f"Failed to notify requester {requester_id}: {e}")
                
                print(f"Campaign {campaign_id} - Requester side expired. Penalty applied to {requester_id}")
        
        # INDEPENDENT EXPIRATION: Handle acceptor side ONLY if they failed
        if acceptor_status == 'pending_posting':
            # Check acceptor's balance before deducting
            acceptor_user = users.find_one({'telegram_id': acceptor_id})
            if acceptor_user:
                current_balance = acceptor_user.get('cpcBalance', 0)
                # Deduct penalty (can go negative)
                users.update_one(
                    {'telegram_id': acceptor_id},
                    {
                        '$inc': {'cpcBalance': -penalty},
                        '$set': {'updated_at': now}
                    }
                )
                
                # Update ONLY acceptor's status to expired
                campaigns.update_one(
                    {'id': campaign_id},
                    {
                        '$set': {
                            'acceptor_status': 'expired',
                            'acceptor_expired_at': now,
                            'updated_at': now
                        }
                    }
                )
                
                # Notify acceptor
                try:
                    send_message(
                        acceptor_id,
                        f"⚠️ Your Campaign Expired!\n\n"
                        f"You failed to post your cross-promo within 48 hours.\n"
                        f"Penalty: -{penalty} CP Coins deducted from your balance.\n\n"
                        f"Partner: {from_channel.get('name')}\n\n"
                        f"Note: Your partner's campaign will continue if they posted on time."
                    )
                except Exception as e:
                    print(f"Failed to notify acceptor {acceptor_id}: {e}")
                
                print(f"Campaign {campaign_id} - Acceptor side expired. Penalty applied to {acceptor_id}")