import time
import random
import uuid
from datetime import datetime
from utils.supabase_client import supabase
from config import Config

class MockEmailService:
    """
    Enhanced mock email service that mimics SendGrid API responses exactly.
    All operations are logged to database for tracking and debugging.
    """
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
    
    def _simulate_delay(self, min_delay=0.5, max_delay=2.0):
        """Simulate realistic API response time"""
        time.sleep(random.uniform(min_delay, max_delay))
    
    def _generate_message_id(self):
        """Generate SendGrid-style message ID"""
        return f"msg_{uuid.uuid4().hex[:16]}"
    
    def _simulate_failure(self, failure_rate=0.1):
        """Simulate random failures based on failure rate"""
        return random.random() < failure_rate
    
    def send_email(self, to_email, subject, content, from_email=None, template_name=None, template_params=None):
        """
        Mock email sending that mimics SendGrid API response structure.
        
        Returns SendGrid-compatible response:
        {
            "success": True,
            "message_id": "msg_abc123...",
            "status": "queued",
            "to": "email@example.com"
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        # Simulate realistic response time
        self._simulate_delay(0.5, 1.5)
        
        # Simulate occasional failures (10% failure rate)
        failed = self._simulate_failure(0.1)
        
        message_id = self._generate_message_id()
        status = 'failed' if failed else 'queued'
        
        # Log to email_logs table with SendGrid-compatible structure
        log_data = {
            'to_email': to_email,
            'from_email': from_email or 'noreply@futurefounders.com',
            'subject': subject,
            'content': content,
            'status': 'sent' if not failed else 'failed',
            'service': 'mock_sendgrid',
            'template_name': template_name,
            'sent_at': datetime.utcnow().isoformat() if not failed else None,
            'metadata': {
                'mock_mode': True,
                'message_id': message_id,
                'sendgrid_status': status,
                'template_params': template_params or {},
                'simulated_at': datetime.utcnow().isoformat()
            }
        }
        
        self._log_to_supabase('email_logs', log_data)
        
        if not failed:
            print(f"[MOCK SendGrid] ✓ Email queued to {to_email}")
            print(f"[MOCK SendGrid] Message ID: {message_id}")
            return {
                "success": True,
                "message_id": message_id,
                "status": "queued",
                "to": to_email,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            print(f"[MOCK SendGrid] ✗ Failed to send email to {to_email}")
            return {
                "success": False,
                "error": "Simulated delivery failure",
                "error_code": "421",
                "to": to_email
            }
    
    def send_batch_emails(self, emails):
        """
        Mock bulk email sending that mimics SendGrid batch API.
        
        Args:
            emails: List of email dictionaries with to_email, subject, content, etc.
        
        Returns SendGrid-compatible batch response:
        {
            "success": True,
            "batch_id": "batch_xyz...",
            "accepted": 5,
            "rejected": 0,
            "results": [...]
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        # Simulate batch processing time (longer than single email)
        self._simulate_delay(1.0, 3.0)
        
        batch_id = f"batch_{uuid.uuid4().hex[:12]}"
        results = []
        accepted = 0
        rejected = 0
        
        for email_data in emails:
            to_email = email_data.get('to_email')
            subject = email_data.get('subject')
            content = email_data.get('content')
            template_name = email_data.get('template_name')
            template_params = email_data.get('template_params', {})
            
            # Send individual email
            result = self.send_email(
                to_email=to_email,
                subject=subject,
                content=content,
                template_name=template_name,
                template_params=template_params
            )
            
            if result['success']:
                accepted += 1
                results.append({
                    "to": to_email,
                    "status": "queued",
                    "message_id": result['message_id']
                })
            else:
                rejected += 1
                results.append({
                    "to": to_email,
                    "status": "rejected",
                    "error": result.get('error', 'Unknown error')
                })
        
        response = {
            "success": True,
            "batch_id": batch_id,
            "accepted": accepted,
            "rejected": rejected,
            "total": len(emails),
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"[MOCK SendGrid] Batch {batch_id}: {accepted} accepted, {rejected} rejected")
        return response
    
    def get_email_status(self, message_id):
        """
        Mock email status check that mimics SendGrid status API.
        
        Returns:
        {
            "message_id": "msg_abc...",
            "status": "delivered",
            "events": [...]
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.3, 0.8)
        
        # Simulate status progression: queued → sent → delivered
        statuses = ['queued', 'sent', 'delivered']
        status = random.choice(statuses)
        
        events = [
            {
                "event": "queued",
                "timestamp": datetime.utcnow().isoformat(),
                "reason": "Message queued for delivery"
            }
        ]
        
        if status in ['sent', 'delivered']:
            events.append({
                "event": "sent",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        if status == 'delivered':
            events.append({
                "event": "delivered",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        return {
            "message_id": message_id,
            "status": status,
            "events": events
        }
    
    def get_email_stats(self):
        """Get email statistics from database"""
        if not self.mock_mode:
            return None
        
        try:
            # Get actual stats from Supabase
            response = self.supabase.table('email_logs').select('*').execute()
            all_emails = response.data if response.data else []
            
            total_emails = len(all_emails)
            sent_emails = len([e for e in all_emails if e.get('status') == 'sent'])
            failed_emails = len([e for e in all_emails if e.get('status') == 'failed'])
            
            return {
                'total_sent': sent_emails,
                'total_failed': failed_emails,
                'delivery_rate': round((sent_emails / total_emails * 100), 1) if total_emails > 0 else 0,
                'last_sent': all_emails[-1].get('sent_at') if all_emails else None,
                'service': 'mock_sendgrid'
            }
        except Exception as e:
            print(f"Error getting email stats: {e}")
            return {
                'total_sent': 0,
                'total_failed': 0,
                'delivery_rate': 0,
                'last_sent': None,
                'error': str(e)
            }
    
    def validate_email_template(self, template_data):
        """Mock email template validation"""
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.1, 0.3)
        
        # Simulate validation (95% success rate)
        failed = self._simulate_failure(0.05)
        
        if not failed:
            template_id = f"tmpl_{uuid.uuid4().hex[:12]}"
            print(f"[MOCK SendGrid] ✓ Template validated: {template_id}")
            return {
                "success": True,
                "template_id": template_id,
                "name": template_data.get('name', 'Untitled Template'),
                "status": "active"
            }
        else:
            print(f"[MOCK SendGrid] ✗ Template validation failed")
            return {
                "success": False,
                "error": "Invalid template structure",
                "error_code": "400"
            }