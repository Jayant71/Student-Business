import requests
from config import Config

class PaymentService:
    def __init__(self):
        self.api_key = Config.INSTAMOJO_API_KEY
        self.auth_token = Config.INSTAMOJO_AUTH_TOKEN
        self.base_url = "https://test.instamojo.com/api/1.1/" # Use test URL for dev
    
    def create_payment_link(self, amount, purpose, buyer_name, email, phone):
        if not self.api_key or not self.auth_token:
            print("Instamojo Credentials missing")
            return None
            
        headers = {
            "X-Api-Key": self.api_key,
            "X-Auth-Token": self.auth_token
        }
        
        data = {
            "amount": amount,
            "purpose": purpose,
            "buyer_name": buyer_name,
            "email": email,
            "phone": phone,
            "redirect_url": "http://localhost:5000/api/webhooks/payment/callback",
            "webhook": "http://your-public-url.com/api/webhooks/payment/webhook"
        }
        
        try:
            # response = requests.post(f"{self.base_url}payment-requests/", headers=headers, data=data)
            # return response.json()
            print(f"Mock Payment Link created for {amount} - {purpose}")
            return {"longurl": "https://test.instamojo.com/mock-payment-link", "id": "mock_id"}
        except Exception as e:
            print(f"Error creating payment link: {e}")
            return None
