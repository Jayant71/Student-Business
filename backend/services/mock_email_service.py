import time
import random
import uuid
from datetime import datetime
from utils.supabase_client import supabase
from config import Config

class MockEmailService:
    def __init__(self):
        self.mock_mode = Config.MOCK_MODE
        self.supabase = supabase
    
    def _log_to_supabase(self, table_name, data):
        """Log mock service actions to Supabase for visibility"""
        try:
            response = self.supabase.table(table_name).insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error logging to Supabase: {e}")
            return None
    
    def send_email(self, to_email, subject, content, from_email=None):
        """Mock email sending that logs to Supabase instead of sending"""
        if not self.mock_mode:
            return False
        
        # Simulate realistic response time
        time.sleep(0.3 + random.uniform(0, 0.7))
        
        # Simulate success/failure scenarios (90% success rate)
        success = random.random() > 0.1
        
        email_id = str(uuid.uuid4())
        
        # Log to email_logs table
        log_data = {
            'id': email_id,
            'to_email': to_email,
            'from_email': from_email or 'noreply@yourdomain.com',
            'subject': subject,
            'content': content,
            'status': 'sent' if success else 'failed',
            'service': 'mock_sendgrid',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'simulated_response_time': round(time.time(), 3)
            }
        }
        
        self._log_to_supabase('email_logs', log_data)
        
        if success:
            print(f"[MOCK] Email sent successfully to {to_email}")
            print(f"[MOCK] Subject: {subject}")
            print(f"[MOCK] Email ID: {email_id}")
            return True
        else:
            print(f"[MOCK] Failed to send email to {to_email}")
            return False
    
    def send_bulk_emails(self, email_list):
        """Mock bulk email sending"""
        if not self.mock_mode:
            return {'sent': 0, 'failed': len(email_list)}
        
        # Simulate bulk processing time
        time.sleep(1 + random.uniform(0, 2))
        
        results = {'sent': 0, 'failed': 0, 'email_ids': []}
        
        for email_data in email_list:
            to_email = email_data.get('to_email')
            subject = email_data.get('subject')
            content = email_data.get('content')
            
            success = self.send_email(to_email, subject, content)
            
            if success:
                results['sent'] += 1
            else:
                results['failed'] += 1
        
        print(f"[MOCK] Bulk email completed: {results['sent']} sent, {results['failed']} failed")
        return results
    
    def get_email_stats(self):
        """Mock email statistics"""
        if not self.mock_mode:
            return None
        
        try:
            # Get actual stats from Supabase if available
            response = self.supabase.table('email_logs').select('count').execute()
            total_emails = len(response.data) if response.data else 0
            
            response_sent = self.supabase.table('email_logs').select('count').eq('status', 'sent').execute()
            sent_emails = len(response_sent.data) if response_sent.data else 0
            
            return {
                'total_sent': sent_emails,
                'total_failed': total_emails - sent_emails,
                'delivery_rate': (sent_emails / total_emails * 100) if total_emails > 0 else 0,
                'last_sent': datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Error getting email stats: {e}")
            # Return mock stats if Supabase query fails
            return {
                'total_sent': random.randint(100, 500),
                'total_failed': random.randint(5, 25),
                'delivery_rate': round(random.uniform(85, 99), 1),
                'last_sent': datetime.utcnow().isoformat()
            }
    
    def validate_email_template(self, template_data):
        """Mock email template validation"""
        if not self.mock_mode:
            return False
        
        time.sleep(0.1 + random.uniform(0, 0.2))
        
        # Simulate validation (95% success rate)
        success = random.random() > 0.05
        
        if success:
            print(f"[MOCK] Email template validated successfully")
            return True
        else:
            print(f"[MOCK] Email template validation failed")
            return False