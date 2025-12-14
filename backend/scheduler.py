from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from models import campaigns, requests_col
from bot import send_message, delete_message
import logging

s = BackgroundScheduler()

def start_scheduler():
    s.add_job(check_and_post_campaigns, 'interval', seconds=20, id='campaign_checker')
    s.add_job(cleanup_finished_campaigns, 'interval', seconds=30, id='campaign_cleanup')
    s.start()


def check_and_post_campaigns():
    # Find scheduled campaigns that are due to post (status: scheduled, start_at <= now)
    now = datetime.utcnow()
    to_post = list(campaigns.find({'status': 'scheduled', 'start_at': {'$lte': now}}))
    for camp in to_post:
        try:
            # Post via bot
            # camp should contain: chat_id, promo (text, image, link, cta), duration_hours, message_id
            chat_id = camp.get('chat_id')
            promo = camp.get('promo', {})
            if promo.get('image'):
                res = send_message(chat_id, f"<b>{promo.get('name')}</b>\n{promo.get('text')}\n{promo.get('link')}")
            else:
                res = send_message(chat_id, f"<b>{promo.get('name')}</b>\n{promo.get('text')}\n{promo.get('link')}")
            if res and res.get('result'):
                message_id = res['result']['message_id']
                campaigns.update_one({'_id': camp['_id']}, {'$set': {'status': 'running', 'message_id': message_id, 'posted_at': datetime.utcnow()}})
                # Schedule deletion
                end_time = datetime.utcnow() + timedelta(hours=camp.get('duration_hours', 8))
                campaigns.update_one({'_id': camp['_id']}, {'$set': {'end_at': end_time}})
        except Exception:
            logging.exception('Failed to post campaign')


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
