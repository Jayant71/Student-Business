"""
Centralized Error Handler

Provides consistent error handling, logging, and user-friendly error messages.
Integrates with error_logs table for tracking and monitoring.
"""

from typing import Dict, Any, Optional, Tuple
from flask import jsonify, request
from datetime import datetime
import traceback
import sys
from utils.supabase_client import supabase


class AppError(Exception):
    """Base application error with status code and details"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_type: str = 'internal_error',
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to JSON-serializable dictionary"""
        return {
            'error': self.error_type,
            'message': self.message,
            'details': self.details
        }


class ValidationError(AppError):
    """Validation error (400)"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, 'validation_error', details)


class AuthenticationError(AppError):
    """Authentication error (401)"""
    def __init__(self, message: str = "Authentication required", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 401, 'authentication_error', details)


class AuthorizationError(AppError):
    """Authorization error (403)"""
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 403, 'authorization_error', details)


class NotFoundError(AppError):
    """Resource not found error (404)"""
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 404, 'not_found', details)


class ConflictError(AppError):
    """Resource conflict error (409)"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 409, 'conflict_error', details)


class RateLimitError(AppError):
    """Rate limit exceeded error (429)"""
    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 429, 'rate_limit_error', details)


class ExternalServiceError(AppError):
    """External service error (502)"""
    def __init__(self, message: str, service_name: str, details: Optional[Dict[str, Any]] = None):
        details = details or {}
        details['service'] = service_name
        super().__init__(message, 502, 'external_service_error', details)


def log_error_to_database(
    error_type: str,
    message: str,
    stack_trace: Optional[str] = None,
    severity: str = 'error',
    request_data: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
) -> Optional[str]:
    """
    Log error to database
    
    Args:
        error_type: Type of error (e.g., 'validation_error', 'internal_error')
        message: Error message
        stack_trace: Stack trace string
        severity: Error severity (info, warning, error, critical)
        request_data: Request context data
        user_id: User ID if available
    
    Returns:
        Error log ID or None if logging failed
    """
    try:
        error_data = {
            'error_type': error_type,
            'message': message,
            'stack_trace': stack_trace,
            'severity': severity,
            'request_data': request_data,
            'user_id': user_id
        }
        
        result = supabase.rpc('log_error', {
            'p_error_type': error_type,
            'p_message': message,
            'p_stack_trace': stack_trace,
            'p_severity': severity,
            'p_request_data': request_data,
            'p_user_id': user_id
        }).execute()
        
        if result.data:
            return result.data
        
        return None
    except Exception as e:
        # Don't fail the request if error logging fails
        print(f"[ERROR HANDLER] Failed to log error to database: {str(e)}")
        return None


def get_request_context() -> Dict[str, Any]:
    """Get current request context for error logging"""
    try:
        return {
            'method': request.method,
            'url': request.url,
            'path': request.path,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown'),
            'referrer': request.referrer
        }
    except:
        return {}


def handle_app_error(error: AppError) -> Tuple[Dict[str, Any], int]:
    """
    Handle application errors
    
    Args:
        error: AppError instance
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    # Log to database if severity warrants it
    if error.status_code >= 500:
        log_error_to_database(
            error_type=error.error_type,
            message=error.message,
            stack_trace=traceback.format_exc(),
            severity='error',
            request_data=get_request_context()
        )
    
    return error.to_dict(), error.status_code


def handle_generic_exception(error: Exception) -> Tuple[Dict[str, Any], int]:
    """
    Handle unexpected exceptions
    
    Args:
        error: Exception instance
    
    Returns:
        Tuple of (response_dict, status_code)
    """
    # Get stack trace
    exc_type, exc_value, exc_traceback = sys.exc_info()
    stack_trace = ''.join(traceback.format_exception(exc_type, exc_value, exc_traceback))
    
    # Log to database
    log_error_to_database(
        error_type='internal_error',
        message=str(error),
        stack_trace=stack_trace,
        severity='critical',
        request_data=get_request_context()
    )
    
    # Return generic error to user (don't expose internal details)
    return {
        'error': 'internal_error',
        'message': 'An unexpected error occurred. Please try again later.',
        'details': {}
    }, 500


def register_error_handlers(app):
    """
    Register error handlers with Flask app
    
    Args:
        app: Flask application instance
    
    Example:
        ```python
        from flask import Flask
        from utils.error_handler import register_error_handlers
        
        app = Flask(__name__)
        register_error_handlers(app)
        ```
    """
    
    @app.errorhandler(AppError)
    def handle_app_error_route(error):
        """Handle custom app errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(AuthenticationError)
    def handle_authentication_error(error):
        """Handle authentication errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(AuthorizationError)
    def handle_authorization_error(error):
        """Handle authorization errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(NotFoundError)
    def handle_not_found_error(error):
        """Handle not found errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(ConflictError)
    def handle_conflict_error(error):
        """Handle conflict errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(RateLimitError)
    def handle_rate_limit_error(error):
        """Handle rate limit errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(ExternalServiceError)
    def handle_external_service_error(error):
        """Handle external service errors"""
        response, status_code = handle_app_error(error)
        return jsonify(response), status_code
    
    @app.errorhandler(404)
    def handle_404(error):
        """Handle 404 errors"""
        return jsonify({
            'error': 'not_found',
            'message': 'The requested resource was not found',
            'details': {}
        }), 404
    
    @app.errorhandler(405)
    def handle_405(error):
        """Handle 405 Method Not Allowed"""
        return jsonify({
            'error': 'method_not_allowed',
            'message': 'The method is not allowed for the requested URL',
            'details': {}
        }), 405
    
    @app.errorhandler(500)
    def handle_500(error):
        """Handle 500 Internal Server Error"""
        response, status_code = handle_generic_exception(error)
        return jsonify(response), status_code
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Catch-all exception handler"""
        response, status_code = handle_generic_exception(error)
        return jsonify(response), status_code


# User-friendly error messages
ERROR_MESSAGES = {
    'validation_error': 'Please check your input and try again.',
    'authentication_error': 'Please log in to continue.',
    'authorization_error': 'You do not have permission to perform this action.',
    'not_found': 'The requested resource could not be found.',
    'conflict_error': 'This action conflicts with existing data.',
    'rate_limit_error': 'You have made too many requests. Please try again later.',
    'external_service_error': 'A third-party service is temporarily unavailable. Please try again later.',
    'internal_error': 'An unexpected error occurred. Our team has been notified.',
    
    # Specific error messages
    'email_already_exists': 'An account with this email already exists.',
    'invalid_credentials': 'Invalid email or password.',
    'payment_failed': 'Payment processing failed. Please check your payment details.',
    'file_too_large': 'The uploaded file is too large.',
    'invalid_file_type': 'The uploaded file type is not supported.',
    'session_expired': 'Your session has expired. Please log in again.',
    'insufficient_balance': 'Insufficient balance to complete this transaction.',
    'invalid_verification_code': 'The verification code is invalid or has expired.',
}


def get_user_friendly_message(error_type: str, default: str = None) -> str:
    """
    Get user-friendly error message
    
    Args:
        error_type: Error type key
        default: Default message if error_type not found
    
    Returns:
        User-friendly error message
    """
    return ERROR_MESSAGES.get(error_type, default or 'An error occurred. Please try again.')
