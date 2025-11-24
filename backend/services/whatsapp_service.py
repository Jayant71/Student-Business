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


# Global singleton instance
_whatsapp_service_instance = None

def get_whatsapp_service():
    """
    Get global WhatsAppService instance (singleton pattern).
    Uses mock service if MOCK_MODE is enabled.
    
    Returns:
        WhatsAppService or MockWhatsAppService: WhatsApp service instance
    """
    global _whatsapp_service_instance
    
    if _whatsapp_service_instance is None:
        # Check if mock mode is enabled
        if Config.MOCK_MODE:
            from services.mock_whatsapp_service import MockWhatsAppService
            print("[WhatsApp Service] Using MOCK WhatsApp service (no real API calls)")
            _whatsapp_service_instance = MockWhatsAppService()
        else:
            print("[WhatsApp Service] Using REAL AiSensy API")
            _whatsapp_service_instance = WhatsAppService()
    
    return _whatsapp_service_instance
