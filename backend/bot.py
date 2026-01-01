import requests
import json
from config import TELEGRAM_BOT_TOKEN, BOT_URL
import logging

API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def send_message(chat_id, text, parse_mode='HTML', reply_markup=None):
    url = f"{API_URL}/sendMessage"
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    if reply_markup is not None:
        # reply_markup should be a dict representing inline keyboard etc.
        # Telegram expects reply_markup as a JSON-serializable object when using
        # application/json; keep as dict and let requests.json handle it.
        payload['reply_markup'] = reply_markup
    try:
        r = requests.post(url, json=payload, timeout=10)
        try:
            r.raise_for_status()
        except requests.exceptions.HTTPError:
            # Attempt to return Telegram error payload if present so callers
            # can inspect the `description` field. Also log the full response.
            try:
                resp = r.json()
            except Exception:
                resp = {'ok': False, 'description': r.text}
            logging.error(f'Failed to send message to chat_id {chat_id}: {resp}')
            return resp
        try:
            return r.json()
        except Exception:
            return {'ok': True, 'result': {}}
    except Exception as e:
        logging.error(f'Failed to send message to chat_id {chat_id}')
        logging.exception('Failed to send message')
        return {'ok': False, 'description': str(e)}
    except Exception as e:
        logging.error(f'Failed to send message to chat_id {chat_id}')
        logging.exception('Failed to send message')
        return None


def send_photo(chat_id, photo_url, caption=None, parse_mode='HTML', reply_markup=None):
    url = f"{API_URL}/sendPhoto"
    payload = {'chat_id': chat_id, 'photo': photo_url, 'caption': caption, 'parse_mode': parse_mode}
    if reply_markup is not None:
        payload['reply_markup'] = reply_markup
    try:
        r = requests.post(url, json=payload, timeout=10)
        try:
            r.raise_for_status()
        except requests.exceptions.HTTPError:
            try:
                resp = r.json()
            except Exception:
                resp = {'ok': False, 'description': r.text}
            logging.error(f'Failed to send photo to {chat_id}: {resp}')
            return resp
        try:
            return r.json()
        except Exception:
            return {'ok': True, 'result': {}}
    except Exception as e:
        logging.exception('Failed to send photo')
        return {'ok': False, 'description': str(e)}


def send_open_button_message(chat_id, text, button_text='Open'):
    """Send a message with an inline URL button that opens the mini app (BOT_URL)."""
    keyboard = {'inline_keyboard': [[{'text': button_text, 'url': BOT_URL}]]}
    return send_message(chat_id, text, reply_markup=keyboard)


def delete_message(chat_id, message_id):
    url = f"{API_URL}/deleteMessage"
    payload = {'chat_id': chat_id, 'message_id': message_id}
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.exception('Failed to delete message')
        return None

def send_promo_preview(chat_id, promo_name, promo_text, promo_link, promo_image, promo_cta):
    """Send a promo preview showing how it will look when posted"""
    try:
        # Build the caption/text
        caption = f"🎯 <b>Preview: {promo_name}</b>\n\n{promo_text}"
        
        # Create inline keyboard with CTA button
        keyboard = None
        if promo_link and promo_cta:
            keyboard = {
                'inline_keyboard': [[
                    {'text': promo_cta, 'url': promo_link}
                ]]
            }
        
        # Send with image if available, otherwise just text
        if promo_image:
            return send_photo(
                chat_id=chat_id,
                photo_url=promo_image,
                caption=caption,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        else:
            return send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode='HTML',
                reply_markup=keyboard
            )
    except Exception as e:
        logging.exception(f'Failed to send promo preview to {chat_id}')
        return None

#Promo message for posting by users
def send_campaign_promo_for_posting(chat_id, promo_text, promo_link, promo_image, promo_cta):
    """
    Send promo for manual posting - NO preview label, professional format
    This is what users will forward to their channels
    
    Args:
        chat_id: User's Telegram ID
        promo_text: The promo text
        promo_link: The promo link
        promo_image: Optional image URL
        promo_cta: Call-to-action button text
    
    Returns:
        Response from Telegram API
    """
    try:
        # Build the message WITHOUT any preview labels
        caption = promo_text
        
        # Create inline keyboard with CTA button if link provided
        keyboard = None
        if promo_link and promo_cta:
            keyboard = {
                'inline_keyboard': [[
                    {'text': promo_cta, 'url': promo_link}
                ]]
            }
        
        # Send with image if available, otherwise just text
        if promo_image:
            result = send_photo(
                chat_id=chat_id,
                photo_url=promo_image,
                caption=caption,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        else:
            result = send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        
        if result and result.get('ok'):
            logging.info(f"[BOT] Successfully sent campaign promo to {chat_id}")
        else:
            logging.error(f"[BOT] Failed to send campaign promo to {chat_id}: {result}")
        
        return result
    
    except Exception as e:
        logging.exception(f'[BOT] Failed to send campaign promo to {chat_id}')
        return None
            
def send_invite_campaign_post(chat_id, promo_text, app_url):
    """
    Send an invite campaign post with CP Gram branding
    This is specifically for the invite task feature
    
    Args:
        chat_id: Telegram channel/chat ID where to post
        promo_text: The promotional text to display
        app_url: URL to the CP Gram app
    
    Returns:
        Response from Telegram API with message details
    """
    try:
        # CP Gram branded image URL
        image_url = "https://ibb.co/Y7V6fX6c"
        
        # Build the caption with professional formatting
        caption = f"<b>🚀 Grow Your Channel with CP Gram!</b>\n\n{promo_text}"
        
        # Create inline keyboard with call-to-action button
        keyboard = {
            'inline_keyboard': [[
                {'text': '🚀 Join CP Gram Now', 'url': app_url}
            ]]
        }
        
        # Send photo with caption and button
        logging.info(f"[BOT] Sending invite campaign to chat_id: {chat_id}")
        result = send_photo(
            chat_id=chat_id,
            photo_url=image_url,
            caption=caption,
            parse_mode='HTML',
            reply_markup=keyboard
        )

        # If photo fails, fallback to text
        if not result or not result.get('ok'):
            logging.warning(f"[BOT] Photo post failed for {chat_id}, falling back to text: {result}")
            result = send_message(chat_id, caption, reply_markup=keyboard)

        if result and result.get('ok'):
            logging.info(f"[BOT] Successfully posted invite campaign to {chat_id}, message_id: {result.get('result', {}).get('message_id')}")
        else:
            logging.error(f"[BOT] Failed to post invite campaign to {chat_id}: {result}")
        
        return result
    
    except Exception as e:
        logging.exception(f'[BOT] Failed to send invite campaign post to {chat_id}')
        return None

def send_campaign_post(chat_id, promo):
    """
    Send a campaign post (for regular cross-promotion campaigns)
    
    Args:
        chat_id: Telegram channel/chat ID where to post
        promo: Dictionary containing promo details (name, text, link, image, cta)
    
    Returns:
        Response from Telegram API with message details
    """
    try:
        promo_name = promo.get('name', 'Promotion')
        promo_text = promo.get('text', '')
        promo_link = promo.get('link', '')
        promo_image = promo.get('image', '')
        promo_cta = promo.get('cta', 'Learn More')
        
        # Build caption
        caption = f"<b>{promo_name}</b>\n\n{promo_text}"
        
        # Add powered by footer
        caption += "\n\n<i>Powered by CP Gram</i>"
        
        # Create inline keyboard with CTA button
        keyboard = None
        if promo_link and promo_cta:
            keyboard = {
                'inline_keyboard': [[
                    {'text': promo_cta, 'url': promo_link}
                ]]
            }
        
        # Send with image if available, otherwise just text
        logging.info(f"Sending campaign post to chat_id: {chat_id}")
        
        if promo_image:
            result = send_photo(
                chat_id=chat_id,
                photo_url=promo_image,
                caption=caption,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        else:
            result = send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        
        if result and result.get('ok'):
            logging.info(f"Successfully posted campaign to {chat_id}, message_id: {result.get('result', {}).get('message_id')}")
        else:
            logging.error(f"Failed to post campaign to {chat_id}: {result}")
        
        return result
    
    except Exception as e:
        logging.exception(f'Failed to send campaign post to {chat_id}')
        return None

    
    except Exception as e:
        logging.exception(f'Failed to send promo preview to {chat_id}')
        return None
    
def send_broadcast_message(chat_id, text, image, link, cta):
    """
    Send a broadcast message to a user
    
    Args:
        chat_id: User's Telegram ID
        text: Broadcast message text
        image: Optional image URL
        link: Optional link URL
        cta: Call-to-action button text
    
    Returns:
        Response from Telegram API
    """
    try:
        # Build the message
        message_text = text
        
        # Create inline keyboard with CTA button if link provided
        keyboard = None
        if link and cta:
            keyboard = {
                'inline_keyboard': [[
                    {'text': cta, 'url': link}
                ]]
            }
        
        # Send with image if available, otherwise just text
        if image:
            result = send_photo(
                chat_id=chat_id,
                photo_url=image,
                caption=message_text,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        else:
            result = send_message(
                chat_id=chat_id,
                text=message_text,
                parse_mode='HTML',
                reply_markup=keyboard
            )
        
        if result and result.get('ok'):
            logging.info(f"[BOT] Successfully sent broadcast to {chat_id}")
        else:
            logging.error(f"[BOT] Failed to send broadcast to {chat_id}: {result}")
        
        return result
    
    except Exception as e:
        logging.exception(f'[BOT] Failed to send broadcast to {chat_id}')
        return None