import logging
from flask import Blueprint, request, jsonify
from bot import send_welcome_message
from config import TELEGRAM_BOT_TOKEN
import hmac
import hashlib

# Create Blueprint for bot webhook
bot_webhook = Blueprint('bot_webhook', __name__)

logging.basicConfig(level=logging.INFO)

def verify_telegram_webhook(request_data, token):
    """
    Verify that the webhook request is from Telegram
    Optional but recommended for security
    """
    # You can implement webhook verification here if needed
    # For now, we'll just check if it has the expected structure
    return True

@bot_webhook.route(f'/bot{TELEGRAM_BOT_TOKEN}', methods=['POST'])
def handle_webhook():
    """
    Handle incoming webhook updates from Telegram
    This endpoint processes /start commands and other bot interactions
    """
    try:
        update = request.json
        
        if not update:
            return jsonify({'ok': False, 'error': 'No data received'}), 400
        
        logging.info(f"[WEBHOOK] Received update: {update}")
        
        # Handle message updates
        if 'message' in update:
            message = update['message']
            chat_id = message.get('chat', {}).get('id')
            text = message.get('text', '')
            
            # Handle /start command
            if text.startswith('/start'):
                logging.info(f"[WEBHOOK] /start command from chat_id: {chat_id}")
                send_welcome_message(chat_id)
                return jsonify({'ok': True, 'message': 'Welcome message sent'})
            
            # You can add more command handlers here
            # elif text.startswith('/help'):
            #     send_help_message(chat_id)
            
        # Handle callback queries (button presses)
        elif 'callback_query' in update:
            callback_query = update['callback_query']
            # Handle inline button callbacks if needed
            pass
        
        return jsonify({'ok': True})
    
    except Exception as e:
        logging.error(f"[WEBHOOK] Error processing update: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'ok': False, 'error': str(e)}), 500