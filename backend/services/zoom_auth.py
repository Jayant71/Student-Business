import requests
import time
from datetime import datetime, timedelta
from config import Config

class ZoomAuth:
    """
    Zoom Server-to-Server OAuth Authentication Manager
    
    Handles OAuth token generation, caching, and automatic refresh.
    Uses Server-to-Server OAuth (no user interaction required).
    
    Reference: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
    """
    
    def __init__(self):
        self.account_id = Config.ZOOM_ACCOUNT_ID
        self.client_id = Config.ZOOM_CLIENT_ID
        self.client_secret = Config.ZOOM_CLIENT_SECRET
        
        # Token cache
        self._access_token = None
        self._token_expiry = None
        
        # Validate credentials
        if not all([self.account_id, self.client_id, self.client_secret]):
            raise ValueError(
                "Missing Zoom credentials. Please set ZOOM_ACCOUNT_ID, "
                "ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in environment variables."
            )
    
    def get_access_token(self):
        """
        Get valid access token, refreshing if necessary.
        
        Returns:
            str: Valid Zoom API access token
        """
        # Return cached token if still valid (with 5-minute buffer)
        if self._access_token and self._token_expiry:
            if datetime.utcnow() < (self._token_expiry - timedelta(minutes=5)):
                return self._access_token
        
        # Generate new token
        return self._generate_token()
    
    def _generate_token(self):
        """
        Generate new access token using Server-to-Server OAuth.
        
        Returns:
            str: New access token
        
        Raises:
            Exception: If token generation fails
        """
        token_url = "https://zoom.us/oauth/token"
        
        # Prepare request
        params = {
            'grant_type': 'account_credentials',
            'account_id': self.account_id
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        try:
            print(f"[Zoom Auth] Generating new access token...")
            
            response = requests.post(
                token_url,
                params=params,
                auth=(self.client_id, self.client_secret),
                headers=headers,
                timeout=10
            )
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract token info
            self._access_token = data['access_token']
            expires_in = data.get('expires_in', 3600)  # Default 1 hour
            
            # Calculate expiry time
            self._token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
            
            print(f"[Zoom Auth] ✓ Token generated successfully (expires in {expires_in}s)")
            
            return self._access_token
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"Failed to generate Zoom token: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data.get('message', error_data.get('reason', 'Unknown error'))}"
            except:
                pass
            
            print(f"[Zoom Auth] ✗ {error_msg}")
            raise Exception(error_msg)
            
        except Exception as e:
            error_msg = f"Zoom authentication error: {str(e)}"
            print(f"[Zoom Auth] ✗ {error_msg}")
            raise Exception(error_msg)
    
    def refresh_token(self):
        """
        Force refresh the access token.
        
        Returns:
            str: New access token
        """
        self._access_token = None
        self._token_expiry = None
        return self._generate_token()
    
    def is_token_valid(self):
        """
        Check if current token is valid.
        
        Returns:
            bool: True if token is valid and not expired
        """
        if not self._access_token or not self._token_expiry:
            return False
        
        return datetime.utcnow() < self._token_expiry
    
    def get_token_info(self):
        """
        Get information about current token.
        
        Returns:
            dict: Token information including expiry
        """
        return {
            'has_token': self._access_token is not None,
            'is_valid': self.is_token_valid(),
            'expires_at': self._token_expiry.isoformat() if self._token_expiry else None,
            'expires_in_seconds': int((self._token_expiry - datetime.utcnow()).total_seconds()) if self._token_expiry else 0
        }


# Global singleton instance
_zoom_auth_instance = None

def get_zoom_auth():
    """
    Get global ZoomAuth instance (singleton pattern).
    
    Returns:
        ZoomAuth: Zoom authentication manager instance
    """
    global _zoom_auth_instance
    
    if _zoom_auth_instance is None:
        _zoom_auth_instance = ZoomAuth()
    
    return _zoom_auth_instance
