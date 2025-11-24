"""
Pagination Utility

Provides standardized pagination for API endpoints with efficient database queries.
"""

from typing import Dict, Any, List, Optional, Tuple
from math import ceil


class PaginationParams:
    """Parse and validate pagination parameters from request"""
    
    def __init__(
        self,
        page: int = 1,
        per_page: int = 20,
        max_per_page: int = 100
    ):
        """
        Initialize pagination parameters
        
        Args:
            page: Current page number (1-indexed)
            per_page: Items per page
            max_per_page: Maximum allowed items per page
        """
        self.page = max(1, int(page))
        self.per_page = min(max(1, int(per_page)), max_per_page)
        self.max_per_page = max_per_page
    
    @property
    def offset(self) -> int:
        """Calculate database offset"""
        return (self.page - 1) * self.per_page
    
    @property
    def limit(self) -> int:
        """Get limit for database query"""
        return self.per_page
    
    @classmethod
    def from_request(cls, request_args: Dict[str, Any]) -> 'PaginationParams':
        """
        Create PaginationParams from Flask request.args
        
        Args:
            request_args: Flask request.args dictionary
        
        Returns:
            PaginationParams instance
        """
        page = request_args.get('page', 1, type=int)
        per_page = request_args.get('per_page', 20, type=int)
        
        return cls(page=page, per_page=per_page)


class PaginatedResponse:
    """Build paginated response with metadata"""
    
    def __init__(
        self,
        items: List[Any],
        total_count: int,
        page: int,
        per_page: int
    ):
        """
        Initialize paginated response
        
        Args:
            items: List of items for current page
            total_count: Total number of items across all pages
            page: Current page number
            per_page: Items per page
        """
        self.items = items
        self.total_count = total_count
        self.page = page
        self.per_page = per_page
    
    @property
    def total_pages(self) -> int:
        """Calculate total number of pages"""
        return ceil(self.total_count / self.per_page) if self.per_page > 0 else 0
    
    @property
    def has_prev(self) -> bool:
        """Check if there's a previous page"""
        return self.page > 1
    
    @property
    def has_next(self) -> bool:
        """Check if there's a next page"""
        return self.page < self.total_pages
    
    @property
    def prev_page(self) -> Optional[int]:
        """Get previous page number"""
        return self.page - 1 if self.has_prev else None
    
    @property
    def next_page(self) -> Optional[int]:
        """Get next page number"""
        return self.page + 1 if self.has_next else None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary for JSON response
        
        Returns:
            Dictionary with items and pagination metadata
        """
        return {
            'items': self.items,
            'pagination': {
                'page': self.page,
                'per_page': self.per_page,
                'total_count': self.total_count,
                'total_pages': self.total_pages,
                'has_prev': self.has_prev,
                'has_next': self.has_next,
                'prev_page': self.prev_page,
                'next_page': self.next_page
            }
        }


def paginate_supabase_query(
    query,
    pagination: PaginationParams,
    count_query = None
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Apply pagination to a Supabase query and get total count
    
    Args:
        query: Supabase query builder instance (before execute)
        pagination: PaginationParams instance
        count_query: Optional separate query for counting (defaults to same as query)
    
    Returns:
        Tuple of (items, total_count)
    
    Example:
        ```python
        from flask import request
        from utils.pagination import PaginationParams, paginate_supabase_query, PaginatedResponse
        
        # Parse pagination params
        pagination = PaginationParams.from_request(request.args)
        
        # Build base query
        query = supabase.table('leads').select('*').eq('status', 'active')
        
        # Apply pagination
        items, total = paginate_supabase_query(query, pagination)
        
        # Build response
        response = PaginatedResponse(items, total, pagination.page, pagination.per_page)
        return jsonify(response.to_dict())
        ```
    """
    # Get total count (use count_query if provided, otherwise use main query)
    if count_query is not None:
        count_result = count_query.execute(count='exact')
    else:
        # Clone query for count
        count_result = query.execute(count='exact')
    
    total_count = count_result.count if hasattr(count_result, 'count') else 0
    
    # Apply pagination to main query
    paginated_query = query.range(
        pagination.offset,
        pagination.offset + pagination.limit - 1
    )
    
    # Execute paginated query
    result = paginated_query.execute()
    items = result.data if result.data else []
    
    return items, total_count


def paginate_list(
    items: List[Any],
    page: int = 1,
    per_page: int = 20
) -> PaginatedResponse:
    """
    Paginate an in-memory list
    
    Args:
        items: Full list of items
        page: Current page number
        per_page: Items per page
    
    Returns:
        PaginatedResponse instance
    
    Example:
        ```python
        all_items = [1, 2, 3, ..., 100]
        response = paginate_list(all_items, page=2, per_page=10)
        return jsonify(response.to_dict())
        ```
    """
    pagination = PaginationParams(page=page, per_page=per_page)
    total_count = len(items)
    
    # Slice list for current page
    start = pagination.offset
    end = start + pagination.limit
    page_items = items[start:end]
    
    return PaginatedResponse(page_items, total_count, pagination.page, pagination.per_page)


def build_pagination_links(
    base_url: str,
    pagination: PaginationParams,
    total_count: int,
    additional_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Optional[str]]:
    """
    Build pagination links for API responses
    
    Args:
        base_url: Base URL for the endpoint
        pagination: PaginationParams instance
        total_count: Total number of items
        additional_params: Additional query parameters to include
    
    Returns:
        Dictionary with first, prev, next, last page URLs
    """
    def build_url(page: int) -> str:
        params = {'page': page, 'per_page': pagination.per_page}
        if additional_params:
            params.update(additional_params)
        
        param_str = '&'.join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}?{param_str}"
    
    total_pages = ceil(total_count / pagination.per_page) if pagination.per_page > 0 else 0
    
    links = {
        'first': build_url(1) if total_pages > 0 else None,
        'prev': build_url(pagination.page - 1) if pagination.page > 1 else None,
        'next': build_url(pagination.page + 1) if pagination.page < total_pages else None,
        'last': build_url(total_pages) if total_pages > 0 else None
    }
    
    return links


# Convenience decorators for pagination
from functools import wraps
from flask import request, jsonify


def paginated_endpoint(max_per_page: int = 100):
    """
    Decorator to automatically handle pagination for an endpoint
    
    The decorated function should return (items, total_count) tuple
    
    Example:
        ```python
        @app.route('/api/leads')
        @paginated_endpoint(max_per_page=50)
        def get_leads():
            pagination = PaginationParams.from_request(request.args)
            
            query = supabase.table('leads').select('*')
            items, total = paginate_supabase_query(query, pagination)
            
            return items, total
        ```
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Parse pagination params
            pagination = PaginationParams.from_request(request.args)
            pagination.max_per_page = max_per_page
            
            # Call the endpoint function
            result = f(*args, pagination=pagination, **kwargs)
            
            # Handle different return types
            if isinstance(result, tuple) and len(result) == 2:
                items, total_count = result
                response = PaginatedResponse(
                    items,
                    total_count,
                    pagination.page,
                    pagination.per_page
                )
                return jsonify(response.to_dict()), 200
            else:
                # Function handled response itself
                return result
        
        return decorated_function
    return decorator
