import os
from dotenv import load_dotenv
import hashlib

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/growthguru')
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
BOT_ADMIN_CHAT_ID = os.getenv('BOT_ADMIN_CHAT_ID')
VITE_API_URL = os.getenv('VITE_API_URL', 'http://localhost:5000')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_EXPIRY_HOURS = 24
ADMIN_TELEGRAM_ID = os.getenv('ADMIN_TELEGRAM_ID', '123456789')
APP_URL = os.getenv('APP_URL', 'http://localhost:3000')
BOT_URL = os.getenv('BOT_URL', 'http://localhost:3000')


def telegram_secret_key():
    # Per Telegram login widget verification: secret key is SHA256 of bot token
    return hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()

# Exchange rate configuration (can be moved to config.py)
STARS_PER_CPC = 1  # 1 Star = 1 CP Coin
CPC_PER_STAR = 1   # 1 CP Coin = 1 Star
MINIMUM_PURCHASE = 100  # Minimum 100 CP Coins