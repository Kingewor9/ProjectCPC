from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from models import campaigns, channels, users, requests_col
from bot import  send_message, send_photo, delete_message, send_broadcast_message, send_invite_campaign_post, send_campaign_post, send_open_button_message
from config import APP_URL, TELEGRAM_BOT_TOKEN
import logging
import threading

s = BackgroundScheduler()

def start_scheduler():
    if not TELEGRAM_BOT_TOKEN:
        logging.warning('[SCHEDULER] TELEGRAM_BOT_TOKEN is not set.')

    # Existing jobs
    s.add_job(check_and_post_campaigns, 'interval', seconds=20, id='campaign_checker')
    s.add_job(cleanup_finished_campaigns, 'interval', seconds=30, id='campaign_cleanup')

    # NEW JOB
    s.add_job(
        check_and_notify_expired_campaigns,
        'interval',
        minutes=1,
        id='expiry_notifier',
        replace_existing=True
    )

    s.start()
    logging.info("[SCHEDULER] Scheduler started with expiry notifications")


def check_and_post_campaigns():
    """Check and post scheduled campaigns"""
    now = datetime.utcnow()
    logging.info(f"[SCHEDULER] Checking campaigns at {now}")
    
    # Find campaigns due in next 2 minutes (to catch any close to posting)
    check_window = now + timedelta(minutes=2)
    to_post = list(campaigns.find({
        'status': 'scheduled', 
        'start_at': {'$lte': check_window}
    }))
    
    logging.info(f"[SCHEDULER] Found {len(to_post)} campaigns to post")
    
    for camp in to_post:
        # Skip if not actually due yet (give 30 second buffer)
        start_at = camp.get('start_at')
        if start_at and start_at > now + timedelta(seconds=30):
            continue
            
        try:
            campaign_id = camp.get('id', str(camp.get('_id')))
            logging.info(f"[SCHEDULER] Processing campaign {campaign_id}")
            
            # Get chat_id with fallbacks
            chat_id = camp.get('chat_id') or camp.get('telegram_chat_id')
            campaign_type = camp.get('type', 'regular')
            
            if not chat_id:
                error_msg = 'No chat_id provided'
                logging.error(f"[SCHEDULER] {error_msg} for campaign {campaign_id}")
                logging.error(f"[SCHEDULER] Campaign data: {camp}")
                campaigns.update_one(
                    {'_id': camp['_id']},
                    {'$set': {'status': 'failed', 'error': error_msg}}
                )
                continue
            
            logging.info(f"[SCHEDULER] Posting to chat_id: {chat_id}, type: {campaign_type}")
            
            res = None
            
            # Handle different campaign types
            if campaign_type == 'invite_task':
                # This is an invite task campaign
                promo_text = camp.get('promo_text', '')
                
                if not promo_text:
                    logging.error(f"[SCHEDULER] No promo_text for invite campaign {campaign_id}")
                    campaigns.update_one(
                        {'_id': camp['_id']},
                        {'$set': {'status': 'failed', 'error': 'No promo_text'}}
                    )
                    continue
                
                logging.info(f"[SCHEDULER] Sending invite campaign to {chat_id}")
                res = send_invite_campaign_post(chat_id, promo_text, APP_URL)
                
            else:
                # This is a regular cross-promotion campaign
                promo = camp.get('promo', {})
                
                if not promo:
                    logging.error(f"[SCHEDULER] No promo data for campaign {campaign_id}")
                    campaigns.update_one(
                        {'_id': camp['_id']},
                        {'$set': {'status': 'failed', 'error': 'No promo data'}}
                    )
                    continue
                
                logging.info(f"[SCHEDULER] Sending regular campaign to {chat_id}")
                res = send_campaign_post(chat_id, promo)
            
            # Check result
            if res and res.get('ok') and res.get('result'):
                message_id = res['result'].get('message_id')
                logging.info(f"[SCHEDULER] Successfully posted campaign {campaign_id}, message_id={message_id}")
                
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
                    duration_hours = camp.get('duration_hours', 12)
                    end_time = datetime.utcnow() + timedelta(hours=duration_hours)
                    campaigns.update_one(
                        {'_id': camp['_id']}, 
                        {'$set': {'end_at': end_time}}
                    )
            else:
                error_msg = res.get('description', 'Failed to send message') if res else 'No response from Telegram'
                logging.error(f"[SCHEDULER] Failed to post campaign {campaign_id}: {error_msg}")
                logging.error(f"[SCHEDULER] Full response: {res}")
                
                # Mark as failed
                campaigns.update_one(
                    {'_id': camp['_id']},
                    {'$set': {'status': 'failed', 'error': error_msg}}
                )
                
        except Exception as e:
            logging.exception(f'[SCHEDULER] Exception posting campaign {campaign_id}')
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


def check_and_notify_expired_campaigns():
    """
    Check for campaigns and invite tasks that have expired and notify users
    Runs every minute
    """
    try:
        now = datetime.datetime.utcnow()
        
        # ====== CHECK FOR MISSED 48-HOUR POSTING DEADLINES ======
        check_posting_deadlines(now)
        
        # ====== CHECK REQUESTER CAMPAIGNS ======
        active_requester_campaigns = list(campaigns.find({
            'requester_status': 'active',
            'requester_notified_expiry': {'$ne': True}
        }))
        
        for campaign in active_requester_campaigns:
            requester_posted_at = campaign.get('requester_posted_at')
            if not requester_posted_at:
                continue
            
            duration_hours = campaign.get('duration_hours', 2)
            expiry_time = requester_posted_at + datetime.timedelta(hours=duration_hours)
            
            # Check if campaign has expired
            if now >= expiry_time:
                from_channel_id = campaign.get('fromChannelId')
                from_channel = channels.find_one({'id': from_channel_id})
                
                if from_channel:
                    owner_id = from_channel.get('owner_id')
                    partner_name = campaign.get('partner_channel_name', 'Partner')
                    
                    if owner_id:
                        # Send notification
                        message = (
                            "⏰ <b>Campaign Timer Complete!</b>\n\n"
                            f"Your campaign with <b>{partner_name}</b> has ended.\n\n"
                            "✅ Next steps:\n"
                            "1. Delete the promotional post from your channel\n"
                            "2. Open the app and click 'End Campaign'\n"
                            "3. Claim your reward!\n\n"
                            "Thank you for using CP Gram! 🚀"
                        )
                        
                        try:
                            send_open_button_message(str(owner_id), message, button_text='Open App')
                            logging.info(f"Sent expiry notification to requester {owner_id} for campaign {campaign.get('id')}")
                        except:
                            send_message(str(owner_id), message)
                        
                        # Mark as notified
                        campaigns.update_one(
                            {'id': campaign.get('id')},
                            {'$set': {'requester_notified_expiry': True}}
                        )
        
        # ====== CHECK ACCEPTOR CAMPAIGNS ======
        active_acceptor_campaigns = list(campaigns.find({
            'acceptor_status': 'active',
            'acceptor_notified_expiry': {'$ne': True}
        }))
        
        for campaign in active_acceptor_campaigns:
            acceptor_posted_at = campaign.get('acceptor_posted_at')
            if not acceptor_posted_at:
                continue
            
            duration_hours = campaign.get('duration_hours', 2)
            expiry_time = acceptor_posted_at + datetime.timedelta(hours=duration_hours)
            
            if now >= expiry_time:
                to_channel_id = campaign.get('toChannelId')
                to_channel = channels.find_one({'id': to_channel_id})
                
                if to_channel:
                    owner_id = to_channel.get('owner_id')
                    partner_name = campaign.get('partner_channel_name', 'Partner')
                    
                    if owner_id:
                        # Send notification
                        message = (
                            "⏰ <b>Campaign Timer Complete!</b>\n\n"
                            f"Your campaign with <b>{partner_name}</b> has ended.\n\n"
                            "✅ Next steps:\n"
                            "1. Delete the promotional post from your channel\n"
                            "2. Open the app and click 'End Campaign'\n"
                            "3. Claim your reward!\n\n"
                            "Thank you for using CP Gram! 🚀"
                        )
                        
                        try:
                            send_open_button_message(str(owner_id), message, button_text='Open App')
                            logging.info(f"Sent expiry notification to acceptor {owner_id} for campaign {campaign.get('id')}")
                        except:
                            send_message(str(owner_id), message)
                        
                        # Mark as notified
                        campaigns.update_one(
                            {'id': campaign.get('id')},
                            {'$set': {'acceptor_notified_expiry': True}}
                        )
        
        # ====== CHECK INVITE TASKS ======
        active_invite_tasks = list(campaigns.find({
            'type': 'invite_task',
            'status': 'active',
            'expiry_notified': {'$ne': True}
        }))
        
        for task in active_invite_tasks:
            posted_at = task.get('posted_at')
            if not posted_at:
                continue
            
            duration_hours = task.get('duration_hours', 12)
            expiry_time = posted_at + datetime.timedelta(hours=duration_hours)
            
            if now >= expiry_time:
                user_id = task.get('user_id')
                
                if user_id:
                    # Send notification
                    message = (
                        "⏰ <b>Invite Task Timer Complete!</b>\n\n"
                        "Your 12-hour promotional post period has ended.\n\n"
                        "✅ Next steps:\n"
                        "1. Delete the promotional post from your channel\n"
                        "2. Open the app and claim your 5,000 CP Coins!\n\n"
                        "Don't forget to claim your reward! 🎉"
                    )
                    
                    try:
                        send_open_button_message(str(user_id), message, button_text='Claim Reward')
                        logging.info(f"Sent expiry notification to user {user_id} for invite task {task.get('id')}")
                    except:
                        send_message(str(user_id), message)
                    
                    # Mark as notified
                    campaigns.update_one(
                        {'id': task.get('id')},
                        {'$set': {'expiry_notified': True}}
                    )
        
        logging.info(f"Checked expired campaigns/tasks at {now}")
        
    except Exception as e:
        logging.error(f"Error checking expired campaigns: {e}")
        import traceback
        traceback.print_exc()
        
def check_posting_deadlines(now):
    """
    Check for campaigns where 48-hour posting deadline has passed
    Penalize users who didn't post
    """
    try:
        # Find campaigns with pending status that have passed the deadline
        pending_campaigns = list(campaigns.find({
            'posting_deadline': {'$lte': now},
            '$or': [
                {'requester_status': 'pending_posting', 'requester_deadline_notified': False},
                {'acceptor_status': 'pending_posting', 'acceptor_deadline_notified': False}
            ]
        }))
        
        for campaign in pending_campaigns:
            campaign_id = campaign.get('id')
            from_channel_id = campaign.get('fromChannelId')
            to_channel_id = campaign.get('toChannelId')
            
            # Get channels
            from_channel = channels.find_one({'id': from_channel_id})
            to_channel = channels.find_one({'id': to_channel_id})
            
            # Check requester
            if campaign.get('requester_status') == 'pending_posting' and not campaign.get('requester_deadline_notified'):
                if from_channel:
                    owner_id = from_channel.get('owner_id')
                    if owner_id:
                        # Penalize requester
                        penalize_user_for_missed_deadline(owner_id, 'requester', campaign_id, to_channel.get('name') if to_channel else 'Partner')
                        
                        # Update campaign status
                        campaigns.update_one(
                            {'id': campaign_id},
                            {
                                '$set': {
                                    'requester_status': 'expired',
                                    'requester_deadline_notified': True,
                                    'updated_at': datetime.datetime.utcnow()
                                }
                            }
                        )
            
            # Check acceptor
            if campaign.get('acceptor_status') == 'pending_posting' and not campaign.get('acceptor_deadline_notified'):
                if to_channel:
                    owner_id = to_channel.get('owner_id')
                    if owner_id:
                        # Penalize acceptor
                        penalize_user_for_missed_deadline(owner_id, 'acceptor', campaign_id, from_channel.get('name') if from_channel else 'Partner')
                        
                        # Update campaign status
                        campaigns.update_one(
                            {'id': campaign_id},
                            {
                                '$set': {
                                    'acceptor_status': 'expired',
                                    'acceptor_deadline_notified': True,
                                    'updated_at': datetime.datetime.utcnow()
                                }
                            }
                        )
        
        if pending_campaigns:
            logging.info(f"Processed {len(pending_campaigns)} expired posting deadlines")
            
    except Exception as e:
        logging.error(f"Error checking posting deadlines: {e}")
        import traceback
        traceback.print_exc()
        
        
def penalize_user_for_missed_deadline(telegram_id, user_role, campaign_id, partner_name):
    """
    Deduct 250 CP from user and notify them
    """
    try:
        penalty = 250
        
        # Deduct CP coins from user
        result = users.update_one(
            {'telegram_id': telegram_id},
            {
                '$inc': {'cpcBalance': -penalty},
                '$set': {'updated_at': datetime.datetime.utcnow()}
            }
        )
        
        if result.modified_count > 0:
            # Send notification
            message = (
                "⚠️ <b>Campaign Posting Deadline Missed</b>\n\n"
                f"Your campaign with <b>{partner_name}</b> has expired.\n\n"
                f"You had 48 hours to post the promotional material but did not complete it.\n\n"
                f"<b>Penalty:</b> -{penalty} CP Coins\n\n"
                "Please ensure you post campaigns within the deadline to avoid penalties in the future.\n\n"
                "The other user will still receive their reward if they completed their side."
            )
            
            try:
                send_open_button_message(str(telegram_id), message, button_text='View Campaigns')
                logging.info(f"Penalized user {telegram_id} with {penalty} CP for missed deadline on campaign {campaign_id}")
            except:
                send_message(str(telegram_id), message)
        
    except Exception as e:
        logging.error(f"Error penalizing user {telegram_id}: {e}")
        import traceback
        traceback.print_exc()
         
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

# Store for tracking broadcast status
broadcast_status = {}

def schedule_broadcast_task(broadcast_id, user_ids, text, image, link, cta, admin_id):
    """
    Schedule a broadcast task to run in background
    """
    broadcast_status[broadcast_id] = {
        'status': 'processing',
        'total': len(user_ids),
        'sent': 0,
        'failed': 0
    }
    
    # Start broadcast in a background thread
    thread = threading.Thread(
        target=process_broadcast,
        args=(broadcast_id, user_ids, text, image, link, cta, admin_id)
    )
    thread.daemon = True
    thread.start()
    
    logging.info(f"[BROADCAST] Task {broadcast_id} scheduled for {len(user_ids)} users")


def process_broadcast(broadcast_id, user_ids, text, image, link, cta, admin_id):
    """
    Process broadcast in background
    Sends messages to all users and notifies admin when complete
    """
    import time
    
    sent_count = 0
    failed_count = 0
    
    logging.info(f"[BROADCAST] Starting broadcast {broadcast_id} to {len(user_ids)} users")
    
    for telegram_id in user_ids:
        if not telegram_id:
            continue
        
        try:
            result = send_broadcast_message(
                chat_id=str(telegram_id),
                text=text,
                image=image,
                link=link,
                cta=cta
            )
            
            if result and result.get('ok'):
                sent_count += 1
            else:
                failed_count += 1
                logging.warning(f"[BROADCAST] Failed to send to {telegram_id}: {result}")
            
            # Update status
            broadcast_status[broadcast_id]['sent'] = sent_count
            broadcast_status[broadcast_id]['failed'] = failed_count
            
            # Small delay to avoid rate limiting (Telegram limit: ~30 messages/second)
            time.sleep(0.05)  # 50ms delay = ~20 messages/second (safe)
            
        except Exception as e:
            failed_count += 1
            logging.error(f"[BROADCAST] Exception sending to {telegram_id}: {e}")
    
    # Mark as complete
    broadcast_status[broadcast_id]['status'] = 'completed'
    
    logging.info(f"[BROADCAST] Completed {broadcast_id}: {sent_count} sent, {failed_count} failed")
    
    # Notify admin about completion
    if admin_id:
        try:
            summary = (
                f"📊 <b>Broadcast Complete</b>\n\n"
                f"✅ Successfully sent: <b>{sent_count}</b>\n"
                f"❌ Failed: <b>{failed_count}</b>\n"
                f"📝 Total users: <b>{len(user_ids)}</b>\n\n"
                f"Broadcast ID: <code>{broadcast_id}</code>"
            )
            
            try:
                send_open_button_message(str(admin_id), summary, button_text='View Dashboard')
            except:
                send_message(str(admin_id), summary)
                
        except Exception as e:
            logging.error(f"[BROADCAST] Failed to notify admin: {e}")