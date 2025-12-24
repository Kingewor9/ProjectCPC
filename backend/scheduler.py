from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from models import campaigns, requests_col
from bot import send_message, send_photo, delete_message,  send_invite_campaign_post, send_campaign_post
from config import APP_URL
import logging

s = BackgroundScheduler()

def start_scheduler():
    s.add_job(check_and_post_campaigns, 'interval', seconds=20, id='campaign_checker')
    s.add_job(cleanup_finished_campaigns, 'interval', seconds=30, id='campaign_cleanup')
    s.start()

def check_and_post_campaigns():
    """Check and post scheduled campaigns"""
    now = datetime.utcnow()
    logging.info(f"[SCHEDULER] Checking campaigns at {now}")
    
    # Find scheduled campaigns that are due to post
    to_post = list(campaigns.find({'status': 'scheduled', 'start_at': {'$lte': now}}))
    
    logging.info(f"[SCHEDULER] Found {len(to_post)} campaigns to post")
    
    for camp in to_post:
        try:
            logging.info(f"[SCHEDULER] Processing campaign {camp.get('id', camp.get('_id'))}")
            
            chat_id = camp.get('chat_id') or camp.get('telegram_chat_id')
            campaign_type = camp.get('type', 'regular')
            
            if not chat_id:
                logging.error(f"[SCHEDULER] No chat_id for campaign {camp.get('id')}")
                campaigns.update_one(
                    {'_id': camp['_id']},
                    {'$set': {'status': 'failed', 'error': 'No chat_id provided'}}
                )
                continue
            
            res = None
            
            # Handle different campaign types
            if campaign_type == 'invite_task':
                # This is an invite task campaign
                promo_text = camp.get('promo_text', '')
                app_url = APP_URL
                
                logging.info(f"[SCHEDULER] Sending invite campaign to {chat_id}")
                res = send_invite_campaign_post(chat_id, promo_text, app_url)
                
            else:
                # This is a regular cross-promotion campaign
                promo = camp.get('promo', {})
                
                if not promo:
                    logging.error(f"[SCHEDULER] No promo data for campaign {camp.get('id')}")
                    campaigns.update_one(
                        {'_id': camp['_id']},
                        {'$set': {'status': 'failed', 'error': 'No promo data'}}
                    )
                    continue
                
                logging.info(f"[SCHEDULER] Sending regular campaign to {chat_id}")
                res = send_campaign_post(chat_id, promo)
            
            if res and res.get('ok') and res.get('result'):
                message_id = res['result']['message_id']
                logging.info(f"[SCHEDULER] Successfully posted campaign {camp.get('id')}, message_id={message_id}")
                
                # Update campaign status
                campaigns.update_one(
                    {'_id': camp['_id']}, 
                    {
                        '$set': {
                            'status': 'running',
                            'message_id': message_id,
                            'posted_at': datetime.utcnow()
                        }
                    }
                )
                
                # Set end time if not already set
                if not camp.get('end_at'):
                    duration_hours = camp.get('duration_hours', 8)
                    end_time = datetime.utcnow() + timedelta(hours=duration_hours)
                    campaigns.update_one(
                        {'_id': camp['_id']}, 
                        {'$set': {'end_at': end_time}}
                    )
            else:
                logging.error(f"[SCHEDULER] Failed to post campaign {camp.get('id')}: {res}")
                # Mark as failed
                error_msg = res.get('description', 'Failed to send message') if res else 'No response from Telegram'
                campaigns.update_one(
                    {'_id': camp['_id']},
                    {'$set': {'status': 'failed', 'error': error_msg}}
                )
                
        except Exception as e:
            logging.exception(f'[SCHEDULER] Failed to post campaign {camp.get("id")}')
            campaigns.update_one(
                {'_id': camp['_id']},
                {'$set': {'status': 'failed', 'error': str(e)}}   
                )
      
def cleanup_finished_campaigns():
    """Cleanup finished campaigns and complete invite tasks"""
    now = datetime.utcnow()
    finished = list(campaigns.find({'status': 'running', 'end_at': {'$lte': now}}))
    
    logging.info(f"[SCHEDULER] Found {len(finished)} campaigns to cleanup")
    
    for camp in finished:
        try:
            chat_id = camp.get('chat_id') or camp.get('telegram_chat_id')
            message_id = camp.get('message_id')
            campaign_type = camp.get('type', 'regular')
            
            # Delete the message
            if chat_id and message_id:
                logging.info(f"[SCHEDULER] Deleting message {message_id} from {chat_id}")
                delete_message(chat_id, message_id)
            
            # Mark campaign as ended
            campaigns.update_one(
                {'_id': camp['_id']}, 
                {'$set': {'status': 'ended', 'ended_at': datetime.utcnow()}}
            )
            
            # If this is an invite task, complete it and reward the user
            if campaign_type == 'invite_task':
                user_id = camp.get('user_id')
                campaign_id = camp.get('id') or str(camp.get('_id'))
                
                if user_id and campaign_id:
                    logging.info(f"[SCHEDULER] Completing invite task for user {user_id}")
                    from app import complete_invite_task
                    complete_invite_task(campaign_id, user_id)
            
            logging.info(f"[SCHEDULER] Successfully cleaned up campaign {camp.get('id')}")
            
        except Exception as e:
            logging.exception(f'[SCHEDULER] Failed to cleanup campaign {camp.get("id")}')
            
def process_invite_campaigns():
    """Process and complete invite campaigns"""
    from app import complete_invite_task
    
    now = datetime.datetime.utcnow()
    
    # Find completed invite campaigns
    completed = campaigns.find({
        'type': 'invite_task',
        'status': 'posted',  # Assuming you mark as posted when bot posts
        'end_at': {'$lte': now}
    })
    
    for campaign in completed:
        # Delete the post (implement with your bot)
        # Then complete the task
        user_id = campaign.get('user_id')
        campaign_id = campaign.get('id')
        
        if user_id and campaign_id:
            complete_invite_task(campaign_id, user_id)
            
            # Mark campaign as completed
            campaigns.update_one(
                {'id': campaign_id},
                {'$set': {'status': 'completed'}}
            )
