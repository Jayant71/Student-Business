"""
Simple In-Memory Cache Utility

Provides caching for frequently accessed data with TTL support.
For production, consider using Redis for distributed caching.
"""

from typing import Any, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
import hashlib
import json
import threading


class CacheEntry:
    """Represents a cached value with expiration"""
    
    def __init__(self, value: Any, ttl_seconds: int):
        self.value = value
        self.expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
    
    def is_expired(self) -> bool:
        """Check if cache entry has expired"""
        return datetime.now() > self.expires_at


class SimpleCache:
    """
    Thread-safe in-memory cache with TTL support
    
    For production with multiple backend instances, use Redis:
    - pip install redis
    - Replace with redis.Redis() client
    """
    
    def __init__(self):
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                return None
            
            if entry.is_expired():
                del self._cache[key]
                return None
            
            return entry.value
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """
        Store value in cache
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time to live in seconds (default: 5 minutes)
        """
        with self._lock:
            self._cache[key] = CacheEntry(value, ttl_seconds)
    
    def delete(self, key: str) -> None:
        """
        Delete value from cache
        
        Args:
            key: Cache key to delete
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern
        
        Args:
            pattern: Pattern to match (supports * wildcard)
        
        Returns:
            Number of keys deleted
        """
        with self._lock:
            # Convert pattern to regex
            import re
            regex_pattern = pattern.replace('*', '.*')
            regex = re.compile(f'^{regex_pattern}$')
            
            # Find matching keys
            matching_keys = [key for key in self._cache.keys() if regex.match(key)]
            
            # Delete matching keys
            for key in matching_keys:
                del self._cache[key]
            
            return len(matching_keys)
    
    def cleanup_expired(self) -> int:
        """
        Remove expired entries from cache
        
        Returns:
            Number of entries removed
        """
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            return len(expired_keys)
    
    def stats(self) -> dict[str, Any]:
        """
        Get cache statistics
        
        Returns:
            Dictionary with cache stats
        """
        with self._lock:
            total_entries = len(self._cache)
            expired_entries = sum(
                1 for entry in self._cache.values()
                if entry.is_expired()
            )
            
            return {
                'total_entries': total_entries,
                'active_entries': total_entries - expired_entries,
                'expired_entries': expired_entries
            }


# Global cache instance
_cache = SimpleCache()


def get_cache() -> SimpleCache:
    """Get global cache instance"""
    return _cache


def cache_key(*args, **kwargs) -> str:
    """
    Generate cache key from function arguments
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
    
    Returns:
        MD5 hash of arguments as cache key
    """
    # Create a stable string representation
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    key_string = '|'.join(key_parts)
    
    # Generate hash
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(ttl_seconds: int = 300, key_prefix: str = ''):
    """
    Decorator to cache function results
    
    Args:
        ttl_seconds: Time to live in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key (default: function name)
    
    Example:
        ```python
        @cached(ttl_seconds=600, key_prefix='user')
        def get_user_profile(user_id: str):
            # Expensive database query
            return supabase.table('profiles').select('*').eq('id', user_id).single().execute()
        ```
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or func.__name__
            key = f"{prefix}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = _cache.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            _cache.set(key, result, ttl_seconds)
            
            return result
        
        # Add cache control methods to wrapper
        wrapper.cache_clear = lambda: _cache.delete_pattern(f"{key_prefix or func.__name__}:*")
        wrapper.cache_info = lambda: _cache.stats()
        
        return wrapper
    return decorator


def invalidate_cache(key_pattern: str) -> int:
    """
    Invalidate cache entries matching pattern
    
    Args:
        key_pattern: Pattern to match (supports * wildcard)
    
    Returns:
        Number of entries invalidated
    
    Example:
        ```python
        # Invalidate all user-related cache
        invalidate_cache('user:*')
        
        # Invalidate specific user
        invalidate_cache(f'user:{user_id}')
        ```
    """
    return _cache.delete_pattern(key_pattern)


# Common cache patterns for the application

def cache_user_profile(ttl: int = 600):
    """Cache decorator for user profile queries"""
    return cached(ttl_seconds=ttl, key_prefix='profile')


def cache_student_data(ttl: int = 300):
    """Cache decorator for student data queries"""
    return cached(ttl_seconds=ttl, key_prefix='student')


def cache_admin_data(ttl: int = 180):
    """Cache decorator for admin dashboard data"""
    return cached(ttl_seconds=ttl, key_prefix='admin')


def cache_payment_links(ttl: int = 900):
    """Cache decorator for payment link queries"""
    return cached(ttl_seconds=ttl, key_prefix='payment_link')


def cache_session_data(ttl: int = 300):
    """Cache decorator for session/schedule data"""
    return cached(ttl_seconds=ttl, key_prefix='session')


def cache_recording_data(ttl: int = 600):
    """Cache decorator for recording data"""
    return cached(ttl_seconds=ttl, key_prefix='recording')


# Cache invalidation helpers

def invalidate_user_cache(user_id: str):
    """Invalidate all cache for a specific user"""
    invalidate_cache(f'profile:*{user_id}*')
    invalidate_cache(f'student:*{user_id}*')


def invalidate_payment_cache(payment_id: str = None):
    """Invalidate payment-related cache"""
    if payment_id:
        invalidate_cache(f'payment_link:*{payment_id}*')
    else:
        invalidate_cache('payment_link:*')


def invalidate_session_cache(session_id: str = None):
    """Invalidate session-related cache"""
    if session_id:
        invalidate_cache(f'session:*{session_id}*')
    else:
        invalidate_cache('session:*')


def invalidate_admin_cache():
    """Invalidate all admin dashboard cache"""
    invalidate_cache('admin:*')


# Periodic cleanup task (call this from a scheduler)
def cleanup_expired_cache():
    """Remove expired entries from cache (run periodically)"""
    removed = _cache.cleanup_expired()
    print(f"[CACHE] Cleaned up {removed} expired entries")
    return removed
