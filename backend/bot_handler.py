import logging
from flask import Blueprint, request, jsonify
from bot import send_welcome_message
from config import TELEGRAM_BOT_TOKEN
import json

# Create Blueprint for bot webhook
bot_webhook = Blueprint('bot_webhook', __name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)

@bot_webhook.route(f'/bot{TELEGRAM_BOT_TOKEN}', methods=['POST'])
def handle_webhook():
    """
    Handle incoming webhook updates from Telegram
    This endpoint processes /start commands and other bot interactions
    """
    try:
        # Log that webhook was called
        logging.info("=" * 80)
        logging.info("[WEBHOOK] Webhook endpoint called!")
        logging.info(f"[WEBHOOK] Method: {request.method}")
        logging.info(f"[WEBHOOK] Headers: {dict(request.headers)}")
        
        # Get the update
        update = request.json
        
        if not update:
            logging.error("[WEBHOOK] No data received in request body")
            return jsonify({'ok': False, 'error': 'No data received'}), 400
        
        # Log the full update
        logging.info(f"[WEBHOOK] Received update: {json.dumps(update, indent=2)}")
        
        # Handle message updates
        if 'message' in update:
            message = update['message']
            chat_id = message.get('chat', {}).get('id')
            text = message.get('text', '')
            user = message.get('from', {})
            
            logging.info(f"[WEBHOOK] Message from user {user.get('id')} ({user.get('username')})")
            logging.info(f"[WEBHOOK] Chat ID: {chat_id}")
            logging.info(f"[WEBHOOK] Message text: {text}")
            
            # Handle /start command
            if text.startswith('/start'):
                logging.info(f"[WEBHOOK] Processing /start command for chat_id: {chat_id}")
                
                try:
                    result = send_welcome_message(chat_id)
                    
                    if result and result.get('ok'):
                         # ✅ INITIALIZE FOLLOW-UP SEQUENCE
                        from models import initialize_user_onboarding
                        initialize_user_onboarding(str(chat_id))
                        
                        logging.info(f"[WEBHOOK] Welcome message sent successfully to {chat_id}")
                        return jsonify({'ok': True, 'message': 'Welcome message sent'})
                    else:
                        logging.error(f"[WEBHOOK] Failed to send welcome message: {result}")
                        return jsonify({'ok': False, 'error': 'Failed to send message'}), 500
                
                except Exception as e:
                    logging.error(f"[WEBHOOK] Exception sending welcome message: {e}")
                    import traceback
                    traceback.print_exc()
                    return jsonify({'ok': False, 'error': str(e)}), 500
            
            else:
                logging.info(f"[WEBHOOK] Non-/start message received: {text}")
                return jsonify({'ok': True, 'message': 'Message received but not /start'})
        
        # Handle callback queries (button presses)
        elif 'callback_query' in update:
            callback_query = update['callback_query']
            logging.info(f"[WEBHOOK] Callback query received: {callback_query}")
            return jsonify({'ok': True, 'message': 'Callback query received'})
        
        # Handle other update types
        else:
            logging.info(f"[WEBHOOK] Other update type received: {list(update.keys())}")
            return jsonify({'ok': True, 'message': 'Update received'})
    
    except Exception as e:
        logging.error(f"[WEBHOOK] Critical error processing update: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'ok': False, 'error': str(e)}), 500


# Add a test endpoint to verify the webhook route is accessible
@bot_webhook.route(f'/bot{TELEGRAM_BOT_TOKEN}', methods=['GET'])
def webhook_test():
    """Test endpoint to verify webhook is accessible"""
    logging.info("[WEBHOOK] GET request to webhook endpoint (test)")
    return jsonify({
        'ok': True,
        'message': 'Webhook endpoint is accessible',
        'endpoint': f'/bot{TELEGRAM_BOT_TOKEN}'
    })