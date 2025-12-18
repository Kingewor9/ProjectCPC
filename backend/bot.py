import requests
import json
from config import TELEGRAM_BOT_TOKEN, APP_URL
import logging

API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def send_message(chat_id, text, parse_mode='HTML', reply_markup=None):
    url = f"{API_URL}/sendMessage"
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    if reply_markup is not None:
        # reply_markup should be a dict representing inline keyboard etc.
        payload['reply_markup'] = reply_markup
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.exception('Failed to send message')
        return None


def send_photo(chat_id, photo_url, caption=None, parse_mode='HTML', reply_markup=None):
    url = f"{API_URL}/sendPhoto"
    payload = {'chat_id': chat_id, 'photo': photo_url, 'caption': caption, 'parse_mode': parse_mode}
    if reply_markup is not None:
        payload['reply_markup'] = reply_markup
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.exception('Failed to send photo')
        return None


def send_open_button_message(chat_id, text, button_text='Open'):
    """Send a message with an inline URL button that opens the web app (APP_URL)."""
    keyboard = {'inline_keyboard': [[{'text': button_text, 'url': APP_URL}]]}
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
