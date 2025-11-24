"""
Input Validation Middleware

Provides validation decorators for Flask routes using schemas.
Sanitizes user inputs and prevents common security vulnerabilities.
"""

from functools import wraps
from flask import request, jsonify
from typing import Dict, Any, Optional, Callable
import re
from email_validator import validate_email, EmailNotValidError


class InputValidator:
    """Input validation and sanitization"""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return ""
        
        # Trim and limit length
        value = value.strip()[:max_length]
        
        # Remove null bytes
        value = value.replace('\x00', '')
        
        return value
    
    @staticmethod
    def sanitize_html(value: str) -> str:
        """Remove HTML tags and script content"""
        if not isinstance(value, str):
            return ""
        
        # Remove script tags and content
        value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove other HTML tags
        value = re.sub(r'<[^>]+>', '', value)
        
        # Remove common XSS patterns
        value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
        value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
        
        return value
    
    @staticmethod
    def validate_email_address(email: str) -> tuple[bool, Optional[str]]:
        """Validate email address format"""
        try:
            # Validate and normalize email
            valid = validate_email(email, check_deliverability=False)
            return True, valid.normalized
        except EmailNotValidError as e:
            return False, str(e)
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number format"""
        if not phone:
            return False
        
        # Remove common separators
        phone = re.sub(r'[-\s\(\)]', '', phone)
        
        # Check if it's a valid format (10-15 digits, optional + prefix)
        return bool(re.match(r'^\+?\d{10,15}$', phone))
    
    @staticmethod
    def validate_uuid(value: str) -> bool:
        """Validate UUID format"""
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(uuid_pattern, value, re.IGNORECASE))
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format"""
        url_pattern = r'^https?://[^\s<>"{}|\\^`\[\]]+$'
        return bool(re.match(url_pattern, url))
    
    @staticmethod
    def validate_schema(data: Dict[str, Any], schema: Dict[str, Dict[str, Any]]) -> tuple[bool, Optional[str], Dict[str, Any]]:
        """
        Validate data against a schema
        
        Args:
            data: Input data to validate
            schema: Schema definition with field rules
            
        Schema format:
            {
                'field_name': {
                    'required': True/False,
                    'type': 'str'/'int'/'float'/'bool'/'email'/'phone'/'uuid'/'url',
                    'min_length': int (for strings),
                    'max_length': int (for strings),
                    'min_value': num (for numbers),
                    'max_value': num (for numbers),
                    'pattern': regex pattern (for strings),
                    'choices': list of valid values,
                    'sanitize': True/False (sanitize HTML)
                }
            }
        
        Returns:
            Tuple of (valid: bool, error_message: str, sanitized_data: dict)
        """
        sanitized_data = {}
        
        for field_name, rules in schema.items():
            value = data.get(field_name)
            
            # Check required fields
            if rules.get('required', False) and value is None:
                return False, f"Field '{field_name}' is required", {}
            
            # Skip validation if field is optional and not provided
            if value is None:
                continue
            
            field_type = rules.get('type', 'str')
            
            # Type validation and conversion
            try:
                if field_type == 'int':
                    value = int(value)
                    if 'min_value' in rules and value < rules['min_value']:
                        return False, f"Field '{field_name}' must be at least {rules['min_value']}", {}
                    if 'max_value' in rules and value > rules['max_value']:
                        return False, f"Field '{field_name}' must be at most {rules['max_value']}", {}
                
                elif field_type == 'float':
                    value = float(value)
                    if 'min_value' in rules and value < rules['min_value']:
                        return False, f"Field '{field_name}' must be at least {rules['min_value']}", {}
                    if 'max_value' in rules and value > rules['max_value']:
                        return False, f"Field '{field_name}' must be at most {rules['max_value']}", {}
                
                elif field_type == 'bool':
                    if isinstance(value, str):
                        value = value.lower() in ('true', '1', 'yes')
                    else:
                        value = bool(value)
                
                elif field_type == 'str':
                    value = str(value)
                    
                    # Sanitize HTML if requested
                    if rules.get('sanitize', False):
                        value = InputValidator.sanitize_html(value)
                    
                    # Trim whitespace
                    value = value.strip()
                    
                    # Length validation
                    if 'min_length' in rules and len(value) < rules['min_length']:
                        return False, f"Field '{field_name}' must be at least {rules['min_length']} characters", {}
                    if 'max_length' in rules and len(value) > rules['max_length']:
                        return False, f"Field '{field_name}' must be at most {rules['max_length']} characters", {}
                    
                    # Pattern validation
                    if 'pattern' in rules and not re.match(rules['pattern'], value):
                        return False, f"Field '{field_name}' has invalid format", {}
                
                elif field_type == 'email':
                    valid, error_or_email = InputValidator.validate_email_address(str(value))
                    if not valid:
                        return False, f"Field '{field_name}' must be a valid email: {error_or_email}", {}
                    value = error_or_email
                
                elif field_type == 'phone':
                    if not InputValidator.validate_phone(str(value)):
                        return False, f"Field '{field_name}' must be a valid phone number", {}
                
                elif field_type == 'uuid':
                    if not InputValidator.validate_uuid(str(value)):
                        return False, f"Field '{field_name}' must be a valid UUID", {}
                
                elif field_type == 'url':
                    if not InputValidator.validate_url(str(value)):
                        return False, f"Field '{field_name}' must be a valid URL", {}
                
                # Choices validation
                if 'choices' in rules and value not in rules['choices']:
                    return False, f"Field '{field_name}' must be one of: {', '.join(map(str, rules['choices']))}", {}
                
                sanitized_data[field_name] = value
                
            except (ValueError, TypeError) as e:
                return False, f"Field '{field_name}' has invalid type: expected {field_type}", {}
        
        return True, None, sanitized_data


def validate_request(schema: Dict[str, Dict[str, Any]]):
    """
    Decorator to validate request data against a schema
    
    Usage:
        @app.route('/api/user', methods=['POST'])
        @validate_request({
            'email': {'required': True, 'type': 'email'},
            'name': {'required': True, 'type': 'str', 'min_length': 2, 'max_length': 100},
            'age': {'required': False, 'type': 'int', 'min_value': 18}
        })
        def create_user():
            data = request.validated_data
            return jsonify({"success": True})
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get request data
            if request.is_json:
                data = request.get_json() or {}
            else:
                data = request.form.to_dict()
            
            # Validate against schema
            validator = InputValidator()
            valid, error, sanitized_data = validator.validate_schema(data, schema)
            
            if not valid:
                return jsonify({
                    'error': 'Validation failed',
                    'message': error
                }), 400
            
            # Attach sanitized data to request
            request.validated_data = sanitized_data
            
            # Execute the route function
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


# Common validation schemas
COMMON_SCHEMAS = {
    'email_required': {
        'email': {'required': True, 'type': 'email'}
    },
    'user_registration': {
        'email': {'required': True, 'type': 'email'},
        'full_name': {'required': True, 'type': 'str', 'min_length': 2, 'max_length': 100, 'sanitize': True},
        'phone': {'required': False, 'type': 'phone'},
        'password': {'required': True, 'type': 'str', 'min_length': 8, 'max_length': 100}
    },
    'admin_request': {
        'email': {'required': True, 'type': 'email'},
        'full_name': {'required': True, 'type': 'str', 'min_length': 2, 'max_length': 100, 'sanitize': True},
        'phone': {'required': False, 'type': 'phone'},
        'reason': {'required': True, 'type': 'str', 'min_length': 10, 'max_length': 500, 'sanitize': True}
    },
    'certificate_generation': {
        'student_id': {'required': True, 'type': 'uuid'},
        'course_name': {'required': True, 'type': 'str', 'min_length': 3, 'max_length': 200, 'sanitize': True},
        'completion_date': {'required': False, 'type': 'str', 'pattern': r'^\d{4}-\d{2}-\d{2}$'},
        'grade': {'required': False, 'type': 'str', 'max_length': 20, 'sanitize': True}
    },
    'support_ticket': {
        'student_id': {'required': True, 'type': 'uuid'},
        'subject': {'required': True, 'type': 'str', 'min_length': 5, 'max_length': 255, 'sanitize': True},
        'description': {'required': True, 'type': 'str', 'min_length': 10, 'max_length': 5000, 'sanitize': True},
        'priority': {'required': False, 'type': 'str', 'choices': ['low', 'medium', 'high', 'urgent']},
        'category': {'required': False, 'type': 'str', 'max_length': 50}
    },
    'ticket_reply': {
        'ticket_id': {'required': True, 'type': 'uuid'},
        'author_id': {'required': True, 'type': 'uuid'},
        'message': {'required': True, 'type': 'str', 'min_length': 1, 'max_length': 5000, 'sanitize': True},
        'is_internal_note': {'required': False, 'type': 'bool'}
    }
}


# Convenience function to get common schemas
def get_schema(schema_name: str) -> Dict[str, Dict[str, Any]]:
    """Get a predefined validation schema"""
    return COMMON_SCHEMAS.get(schema_name, {})
