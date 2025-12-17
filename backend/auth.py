import jwt
from config import JWT_SECRET, JWT_EXPIRY_HOURS
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify


def create_token(telegram_id):
    """Create a JWT token for a user."""
    payload = {
        'telegram_id': str(telegram_id),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_token(token):
    """Verify and decode a JWT token. Returns user_id or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('telegram_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'token required'}), 401

        token = auth_header.replace('Bearer ', '')
        telegram_id = verify_token(token)

        if not telegram_id:
            return jsonify({'error': 'invalid or expired token'}), 401

        request.telegram_id = telegram_id
        return f(*args, **kwargs)

    return decorated
