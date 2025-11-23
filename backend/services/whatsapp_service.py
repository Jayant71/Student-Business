import requests
from config import Config

class WhatsAppService:
    def __init__(self):
        self.api_key = Config.AISENSY_API_KEY
        self.base_url = "https://backend.aisensy.com/campaign/t1/api/v2"
    
    def send_message(self, to_number, template_name, params=None):
        if not self.api_key:
            print("AiSensy API Key missing")
            return False
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "apiKey": self.api_key,
            "campaignName": "test_campaign",
            "destination": to_number,
            "userName": "User",
            "templateParams": params or [],
            "source": "new-landing-page form",
            "media": {}
        }
        
        # Note: This is a mock implementation. Actual AiSensy API structure might differ.
        try:
            # response = requests.post(self.base_url, headers=headers, json=data)
            # return response.status_code == 200
            print(f"Mock WhatsApp sent to {to_number} using template {template_name}")
            return True
        except Exception as e:
            print(f"Error sending WhatsApp: {e}")
            return False
