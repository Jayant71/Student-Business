import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")
    
    # Mock Mode Configuration
    MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"
    
    # External Services
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    AISENSY_API_KEY = os.getenv("AISENSY_API_KEY")
    BOLNA_API_KEY = os.getenv("BOLNA_API_KEY")
    INSTAMOJO_API_KEY = os.getenv("INSTAMOJO_API_KEY")
    INSTAMOJO_AUTH_TOKEN = os.getenv("INSTAMOJO_AUTH_TOKEN")
