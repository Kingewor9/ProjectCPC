import jwt
from config import JWT_SECRET, JWT_EXPIRY_HOURS
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify


def create_token(user_id):
    """Create a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_token(token):
    """Verify and decode a JWT token. Returns user_id or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to protect routes with JWT token verification."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'token required'}), 401
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': 'invalid or expired token'}), 401
        
        request.user_id = user_id
        return f(*args, **kwargs)
    
    return decorated
