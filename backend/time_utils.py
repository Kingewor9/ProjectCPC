from datetime import datetime, timedelta
from dateutil.parser import parse as parse_time
import calendar

def parse_day_time_to_utc(day_name: str, time_slot: str) -> datetime:
    """
    Convert day name (e.g., 'Monday') and time slot (e.g., '14:00 - 15:00 UTC') 
    to the next occurrence as a UTC datetime.
    
    Returns: next datetime in UTC when the post should be made (start of time slot).
    """
    # Parse time slot (e.g., "14:00 - 15:00 UTC" -> extract "14:00")
    time_str = time_slot.split(' - ')[0].strip()  # "14:00"
    hour, minute = map(int, time_str.split(':'))
    
    # Get day of week (0=Monday, 6=Sunday)
    day_map = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
    }
    target_weekday = day_map.get(day_name, 0)
    
    # Calculate next occurrence of target_weekday
    now = datetime.utcnow()
    current_weekday = now.weekday()
    
    # Calculate days until target day
    days_ahead = target_weekday - current_weekday
    
    # If it's the same day, check if the time has passed
    if days_ahead == 0:
        # It's today - check if time has passed
        target_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if target_time > now:
            # Time hasn't passed yet today, schedule for today
            return target_time
        else:
            # Time has passed, schedule for next week
            days_ahead = 7
    elif days_ahead < 0:
        # Target day already happened this week
        days_ahead += 7
    
    next_occurrence = now + timedelta(days=days_ahead)
    # Set time to the specified hour and minute
    next_occurrence = next_occurrence.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    return next_occurrence


def calculate_end_time(start_time: datetime, duration_hours: int) -> datetime:
    """Calculate the end time given start time and duration in hours."""
    return start_time + timedelta(hours=duration_hours)
