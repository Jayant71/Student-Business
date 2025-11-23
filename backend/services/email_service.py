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
