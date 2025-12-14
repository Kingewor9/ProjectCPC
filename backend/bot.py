import requests
from config import TELEGRAM_BOT_TOKEN
import logging

API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


def send_message(chat_id, text, parse_mode='HTML'):
    url = f"{API_URL}/sendMessage"
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.exception('Failed to send message')
        return None


def send_photo(chat_id, photo_url, caption=None, parse_mode='HTML'):
    url = f"{API_URL}/sendPhoto"
    payload = {'chat_id': chat_id, 'photo': photo_url, 'caption': caption, 'parse_mode': parse_mode}
    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logging.exception('Failed to send photo')
        return None


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
