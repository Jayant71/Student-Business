import requests
from config import Config

class EmailService:
    def __init__(self):
        self.api_key = Config.SENDGRID_API_KEY
        self.base_url = "https://api.sendgrid.com/v3/mail/send"
    
    def send_email(self, to_email, subject, content):
        if not self.api_key:
            print("SendGrid API Key missing")
            return False
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": "noreply@yourdomain.com"},
            "subject": subject,
            "content": [{"type": "text/plain", "value": content}]
        }
        
        try:
            response = requests.post(self.base_url, headers=headers, json=data)
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"Error sending email: {e}")
            return False


# Global singleton instance
_email_service_instance = None

def get_email_service():
    """
    Get global EmailService instance (singleton pattern).
    Uses mock service if MOCK_MODE is enabled.
    
    Returns:
        EmailService or MockEmailService: Email service instance
    """
    global _email_service_instance
    
    if _email_service_instance is None:
        # Check if mock mode is enabled
        if Config.MOCK_MODE:
            from services.mock_email_service import MockEmailService
            print("[Email Service] Using MOCK Email service (no real API calls)")
            _email_service_instance = MockEmailService()
        else:
            print("[Email Service] Using REAL SendGrid API")
            _email_service_instance = EmailService()
    
    return _email_service_instance
