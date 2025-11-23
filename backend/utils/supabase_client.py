from supabase import create_client, Client
from config import Config

def get_supabase_client() -> Client:
    url = Config.SUPABASE_URL
    key = Config.SUPABASE_SERVICE_KEY
    
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment variables.")
        
    return create_client(url, key)

supabase = get_supabase_client()
