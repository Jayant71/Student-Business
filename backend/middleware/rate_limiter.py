"""
Rate Limiting Middleware

Implements rate limiting for Flask routes to prevent abuse and DDoS attacks.
Uses database-backed tracking for distributed rate limiting.
"""

from functools import wraps
from flask import request, jsonify, g
from datetime import datetime
from typing import Optional, Tuple
from supabase import Client


class RateLimiter:
    """Rate limiter using database for persistence"""
    
    # Default rate limits (requests per window)
    DEFAULT_LIMITS = {
        'api': (100, 60),      # 100 requests per 60 seconds
        'auth': (5, 300),      # 5 requests per 5 minutes
        'upload': (10, 60),    # 10 uploads per minute
        'payment': (10, 60),   # 10 payment operations per minute
        'strict': (20, 60),    # 20 requests per minute (for sensitive operations)
    }
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    def get_identifier(self) -> str:
        """Get unique identifier for the request (user ID or IP)"""
        # Try to get authenticated user ID first
        user_id = getattr(g, 'user_id', None)
        if user_id:
            return f"user:{user_id}"
        
        # Fall back to IP address
        if request.headers.get('X-Forwarded-For'):
            # Get first IP from X-Forwarded-For header
            ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
        else:
            ip = request.remote_addr or 'unknown'
        
        return f"ip:{ip}"
    
    def check_limit(
        self,
        identifier: str,
        endpoint: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, dict]:
        """
        Check if request is within rate limit
        
        Returns:
            Tuple of (allowed: bool, info: dict)
        """
        try:
            response = self.supabase.rpc('check_rate_limit', {
                'p_identifier': identifier,
                'p_endpoint': endpoint,
                'p_max_requests': max_requests,
                'p_window_seconds': window_seconds
            }).execute()
            
            if response.data and len(response.data) > 0:
                result = response.data[0]
                return result['allowed'], {
                    'remaining': result['remaining'],
                    'reset_at': result['reset_at']
                }
            
            # Default to allowing if check fails
            return True, {'remaining': max_requests, 'reset_at': None}
            
        except Exception as e:
            print(f"[Rate Limiter] Error checking rate limit: {str(e)}")
            # Fail open - allow request if rate limit check fails
            return True, {'remaining': max_requests, 'reset_at': None}
    
    def limit(
        self,
        limit_type: str = 'api',
        custom_limit: Optional[Tuple[int, int]] = None
    ):
        """
        Decorator to apply rate limiting to a route
        
        Args:
            limit_type: Type of limit to apply (api, auth, upload, payment, strict)
            custom_limit: Optional custom (max_requests, window_seconds) tuple
        
        Usage:
            @app.route('/api/endpoint')
            @rate_limiter.limit('api')
            def my_endpoint():
                return jsonify({"success": True})
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Get rate limit parameters
                if custom_limit:
                    max_requests, window_seconds = custom_limit
                else:
                    max_requests, window_seconds = self.DEFAULT_LIMITS.get(
                        limit_type,
                        self.DEFAULT_LIMITS['api']
                    )
                
                # Get identifier
                identifier = self.get_identifier()
                
                # Get endpoint path
                endpoint = request.endpoint or request.path
                
                # Check rate limit
                allowed, info = self.check_limit(
                    identifier=identifier,
                    endpoint=endpoint,
                    max_requests=max_requests,
                    window_seconds=window_seconds
                )
                
                # Add rate limit headers
                response_headers = {
                    'X-RateLimit-Limit': str(max_requests),
                    'X-RateLimit-Remaining': str(info.get('remaining', 0)),
                    'X-RateLimit-Reset': info.get('reset_at', ''),
                }
                
                if not allowed:
                    # Rate limit exceeded
                    response = jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Too many requests. Please try again later.',
                        'retry_after': info.get('reset_at')
                    })
                    response.status_code = 429
                    response.headers.update(response_headers)
                    return response
                
                # Execute the route function
                result = f(*args, **kwargs)
                
                # Add rate limit headers to successful response
                if hasattr(result, 'headers'):
                    result.headers.update(response_headers)
                
                return result
            
            return decorated_function
        return decorator


# Global instance (initialized by app)
_rate_limiter_instance: Optional[RateLimiter] = None


def init_rate_limiter(supabase_client: Client) -> RateLimiter:
    """Initialize rate limiter"""
    global _rate_limiter_instance
    _rate_limiter_instance = RateLimiter(supabase_client)
    print("[Rate Limiter] Initialized")
    return _rate_limiter_instance


def get_rate_limiter() -> RateLimiter:
    """Get rate limiter instance"""
    if _rate_limiter_instance is None:
        raise RuntimeError("Rate limiter not initialized. Call init_rate_limiter() first.")
    return _rate_limiter_instance


# Convenience decorators for common use cases
def rate_limit_api(f):
    """Apply standard API rate limit"""
    return get_rate_limiter().limit('api')(f)


def rate_limit_auth(f):
    """Apply strict rate limit for auth endpoints"""
    return get_rate_limiter().limit('auth')(f)


def rate_limit_upload(f):
    """Apply rate limit for file uploads"""
    return get_rate_limiter().limit('upload')(f)


def rate_limit_payment(f):
    """Apply rate limit for payment operations"""
    return get_rate_limiter().limit('payment')(f)


def rate_limit_strict(f):
    """Apply strict rate limit for sensitive operations"""
    return get_rate_limiter().limit('strict')(f)


# Cleanup function (should be called periodically)
def cleanup_old_rate_limits(supabase_client: Client) -> int:
    """Clean up old rate limit records"""
    try:
        response = supabase_client.rpc('cleanup_old_rate_limits').execute()
        deleted_count = response.data if response.data else 0
        print(f"[Rate Limiter] Cleaned up {deleted_count} old records")
        return deleted_count
    except Exception as e:
        print(f"[Rate Limiter] Error cleaning up: {str(e)}")
        return 0
