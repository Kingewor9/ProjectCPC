from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from models import campaigns, requests_col
from bot import send_message, send_photo, delete_message
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
            
            chat_id = camp.get('chat_id')
            promo = camp.get('promo', {})
            
            if not chat_id:
                logging.error(f"[SCHEDULER] No chat_id for campaign {camp.get('id')}")
                continue
            
            # Build message text
            promo_name = promo.get('name', 'Promo')
            promo_text = promo.get('text', '')
            promo_link = promo.get('link', '')
            
            text = f"<b>{promo_name}</b>\n\n{promo_text}"
            if promo_link:
                text += f"\n\n🔗 {promo_link}"
            text += f"\n\n<i>Powered by CP Gram</i>"
            
            # Build CTA button
            cta_text = promo.get('cta') or 'Learn More'
            button_url = promo_link or APP_URL
            reply_markup = {'inline_keyboard': [[{'text': cta_text, 'url': button_url}]]}
            
            # Send the message
            res = None
            if promo.get('image'):
                logging.info(f"[SCHEDULER] Sending photo to {chat_id}")
                res = send_photo(chat_id, promo.get('image'), caption=text, reply_markup=reply_markup)
            else:
                logging.info(f"[SCHEDULER] Sending text message to {chat_id}")
                res = send_message(chat_id, text, reply_markup=reply_markup)
            
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
                
                # Set end time
                duration_hours = camp.get('duration_hours', 8)
                end_time = datetime.utcnow() + timedelta(hours=duration_hours)
                campaigns.update_one(
                    {'_id': camp['_id']}, 
                    {'$set': {'end_at': end_time}}
                )
            else:
                logging.error(f"[SCHEDULER] Failed to post campaign {camp.get('id')}: {res}")
                # Mark as failed
                campaigns.update_one(
                    {'_id': camp['_id']},
                    {'$set': {'status': 'failed', 'error': 'Failed to send message'}}
                )
                
        except Exception as e:
            logging.exception(f'[SCHEDULER] Failed to post campaign {camp.get("id")}')
            campaigns.update_one(
                {'_id': camp['_id']},
                {'$set': {'status': 'failed', 'error': str(e)}}
            )

def cleanup_finished_campaigns():
    now = datetime.utcnow()
    finished = list(campaigns.find({'status': 'running', 'end_at': {'$lte': now}}))
    for camp in finished:
        try:
            chat_id = camp.get('chat_id')
            message_id = camp.get('message_id')
            if chat_id and message_id:
                delete_message(chat_id, message_id)
            campaigns.update_one({'_id': camp['_id']}, {'$set': {'status': 'ended', 'ended_at': datetime.utcnow()}})
        except Exception:
            logging.exception('Failed to cleanup campaign')
            
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
