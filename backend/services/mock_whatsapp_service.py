import time
import random
import uuid
from datetime import datetime, timedelta
from utils.supabase_client import supabase
from config import Config

class MockWhatsAppService:
    """
    Enhanced mock WhatsApp service that mimics AiSensy API responses exactly.
    Includes delivery status progression simulation.
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
    
    def _simulate_delay(self, min_delay=1.0, max_delay=3.0):
        """Simulate realistic WhatsApp API response time"""
        time.sleep(random.uniform(min_delay, max_delay))
    
    def _generate_campaign_id(self):
        """Generate AiSensy-style campaign ID"""
        return f"camp_{uuid.uuid4().hex[:16]}"
    
    def _generate_message_id(self):
        """Generate AiSensy-style message ID"""
        return f"wa_msg_{uuid.uuid4().hex[:20]}"
    
    def _simulate_failure(self, failure_rate=0.05):
        """Simulate random failures based on failure rate"""
        return random.random() < failure_rate
    
    def send_message(self, to_number, template_name, params=None, campaign_name=None):
        """
        Mock WhatsApp message sending that mimics AiSensy API response structure.
        
        Returns AiSensy-compatible response:
        {
            "success": True,
            "campaign_id": "camp_abc123...",
            "message_id": "wa_msg_xyz...",
            "status": "sent",
            "destination": "+1234567890",
            "timestamp": "2025-11-24T10:30:00Z"
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        # Simulate realistic WhatsApp API response time
        self._simulate_delay(1.0, 2.5)
        
        # Simulate occasional failures (5% failure rate)
        failed = self._simulate_failure(0.05)
        
        message_id = self._generate_message_id()
        campaign_id = self._generate_campaign_id()
        status = 'failed' if failed else 'sent'
        
        # Log to whatsapp_logs table with AiSensy-compatible structure
        log_data = {
            'to_number': to_number,
            'template_name': template_name,
            'template_params': params or {},
            'status': status,
            'service': 'mock_aisensy',
            'sent_at': datetime.utcnow().isoformat() if not failed else None,
            'metadata': {
                'mock_mode': True,
                'message_id': message_id,
                'campaign_id': campaign_id,
                'campaign_name': campaign_name or 'mock_campaign',
                'aisensy_status': status,
                'simulated_at': datetime.utcnow().isoformat()
            }
        }
        
        # Also log to crm_messages for unified communication view
        crm_data = {
            'channel': 'whatsapp',
            'direction': 'outbound',
            'content': f"Template: {template_name}",
            'status': status,
            'external_message_id': message_id,
            'metadata': {
                'template_params': params or {},
                'campaign_id': campaign_id
            },
            'created_at': datetime.utcnow().isoformat()
        }
        
        self._log_to_supabase('whatsapp_logs', log_data)
        self._log_to_supabase('crm_messages', crm_data)
        
        if not failed:
            print(f"[MOCK AiSensy] ✓ WhatsApp message sent to {to_number}")
            print(f"[MOCK AiSensy] Message ID: {message_id}")
            print(f"[MOCK AiSensy] Template: {template_name}")
            return {
                "success": True,
                "campaign_id": campaign_id,
                "message_id": message_id,
                "status": "sent",
                "destination": to_number,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            print(f"[MOCK AiSensy] ✗ Failed to send WhatsApp message to {to_number}")
            return {
                "success": False,
                "error": "Simulated delivery failure",
                "error_code": "E001",
                "destination": to_number
            }
    
    def send_bulk_messages(self, contacts, template_name, params=None, campaign_name=None):
        """
        Mock bulk WhatsApp messaging that mimics AiSensy batch API.
        
        Args:
            contacts: List of contact dictionaries with phone_number
            template_name: WhatsApp template name
            params: Template parameters
            campaign_name: Campaign identifier
        
        Returns AiSensy-compatible batch response:
        {
            "success": True,
            "campaign_id": "camp_xyz...",
            "sent": 5,
            "failed": 0,
            "results": [...]
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        # Simulate bulk processing time (longer than single message)
        self._simulate_delay(2.0, 4.0)
        
        campaign_id = self._generate_campaign_id()
        results = []
        sent = 0
        failed = 0
        
        for contact in contacts:
            phone_number = contact.get('phone_number')
            contact_params = params or contact.get('template_params', {})
            
            # Send individual message
            result = self.send_message(
                to_number=phone_number,
                template_name=template_name,
                params=contact_params,
                campaign_name=campaign_name
            )
            
            if result['success']:
                sent += 1
                results.append({
                    "destination": phone_number,
                    "status": "sent",
                    "message_id": result['message_id']
                })
            else:
                failed += 1
                results.append({
                    "destination": phone_number,
                    "status": "failed",
                    "error": result.get('error', 'Unknown error')
                })
        
        response = {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name or 'mock_campaign',
            "sent": sent,
            "failed": failed,
            "total": len(contacts),
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"[MOCK AiSensy] Campaign {campaign_id}: {sent} sent, {failed} failed")
        return response
    
    def get_message_status(self, message_id):
        """
        Mock message status check that mimics AiSensy status API.
        Simulates status progression: sent → delivered → read
        
        Returns:
        {
            "message_id": "wa_msg_abc...",
            "status": "delivered",
            "events": [...]
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.3, 0.8)
        
        # Simulate status progression: sent → delivered → read
        statuses = ['sent', 'delivered', 'read']
        weights = [0.2, 0.5, 0.3]  # More likely to be delivered or read
        status = random.choices(statuses, weights=weights)[0]
        
        now = datetime.utcnow()
        events = [
            {
                "event": "sent",
                "timestamp": (now - timedelta(minutes=5)).isoformat(),
                "reason": "Message sent to WhatsApp server"
            }
        ]
        
        if status in ['delivered', 'read']:
            events.append({
                "event": "delivered",
                "timestamp": (now - timedelta(minutes=2)).isoformat()
            })
        
        if status == 'read':
            events.append({
                "event": "read",
                "timestamp": now.isoformat()
            })
        
        return {
            "message_id": message_id,
            "status": status,
            "events": events
        }
    
    def send_media_message(self, to_number, media_type, media_url, caption=None):
        """
        Mock media message sending (image, PDF, video).
        
        Returns:
        {
            "success": True,
            "message_id": "wa_msg_...",
            "media_type": "image",
            "status": "sent"
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(1.5, 3.0)
        
        failed = self._simulate_failure(0.05)
        message_id = self._generate_message_id()
        
        # Log media message
        log_data = {
            'to_number': to_number,
            'template_name': f'media_{media_type}',
            'template_params': {
                'media_url': media_url,
                'caption': caption or '',
                'media_type': media_type
            },
            'status': 'failed' if failed else 'sent',
            'service': 'mock_aisensy',
            'sent_at': datetime.utcnow().isoformat() if not failed else None,
            'metadata': {
                'mock_mode': True,
                'message_id': message_id,
                'media_message': True,
                'media_type': media_type
            }
        }
        
        self._log_to_supabase('whatsapp_logs', log_data)
        
        if not failed:
            print(f"[MOCK AiSensy] ✓ Media message ({media_type}) sent to {to_number}")
            return {
                "success": True,
                "message_id": message_id,
                "media_type": media_type,
                "status": "sent",
                "destination": to_number,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            print(f"[MOCK AiSensy] ✗ Failed to send media message to {to_number}")
            return {
                "success": False,
                "error": "Media upload failed",
                "error_code": "E002"
            }
    
    def get_stats(self):
        """Get WhatsApp messaging statistics from database"""
        if not self.mock_mode:
            return None
        
        try:
            # Get actual stats from Supabase
            response = self.supabase.table('whatsapp_logs').select('*').execute()
            all_messages = response.data if response.data else []
            
            total_messages = len(all_messages)
            sent_messages = len([m for m in all_messages if m.get('status') == 'sent'])
            failed_messages = len([m for m in all_messages if m.get('status') == 'failed'])
            
            return {
                'total_sent': sent_messages,
                'total_failed': failed_messages,
                'delivery_rate': round((sent_messages / total_messages * 100), 1) if total_messages > 0 else 0,
                'last_sent': all_messages[-1].get('sent_at') if all_messages else None,
                'service': 'mock_aisensy'
            }
        except Exception as e:
            print(f"Error getting WhatsApp stats: {e}")
            return {
                'total_sent': 0,
                'total_failed': 0,
                'delivery_rate': 0,
                'last_sent': None,
                'error': str(e)
            }
        
        print(f"[MOCK] Bulk WhatsApp completed: {results['sent']} sent, {results['failed']} failed")
        return results
    
    def create_campaign(self, campaign_name, contacts, template_name):
        """Mock WhatsApp campaign creation"""
        if not self.mock_mode:
            return None
        
        # Simulate campaign creation time
        time.sleep(0.5 + random.uniform(0, 0.5))
        
        campaign_id = str(uuid.uuid4())
        
        # Log campaign data
        campaign_data = {
            'id': campaign_id,
            'name': campaign_name,
            'template': template_name,
            'contacts_count': len(contacts),
            'sent_count': 0,
            'read_count': 0,
            'reply_count': 0,
            'status': 'created',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'service': 'mock_aisensy'
            }
        }
        
        self._log_to_supabase('whatsapp_campaigns', campaign_data)
        
        print(f"[MOCK] WhatsApp campaign created: {campaign_name}")
        print(f"[MOCK] Campaign ID: {campaign_id}")
        print(f"[MOCK] Contacts: {len(contacts)}")
        
        return {
            'campaign_id': campaign_id,
            'name': campaign_name,
            'status': 'created',
            'contacts_count': len(contacts)
        }
    
    def get_whatsapp_stats(self):
        """Mock WhatsApp statistics"""
        if not self.mock_mode:
            return None
        
        try:
            # Get actual stats from Supabase if available
            response = self.supabase.table('whatsapp_logs').select('count').execute()
            total_messages = len(response.data) if response.data else 0
            
            response_sent = self.supabase.table('whatsapp_logs').select('count').eq('status', 'sent').execute()
            sent_messages = len(response_sent.data) if response_sent.data else 0
            
            # Simulate read and reply counts
            read_count = int(sent_messages * random.uniform(0.8, 0.95))
            reply_count = int(sent_messages * random.uniform(0.1, 0.2))
            
            return {
                'total_sent': sent_messages,
                'total_delivered': sent_messages,
                'total_read': read_count,
                'total_replied': reply_count,
                'read_rate': round((read_count / sent_messages * 100) if sent_messages > 0 else 0, 1),
                'reply_rate': round((reply_count / sent_messages * 100) if sent_messages > 0 else 0, 1)
            }
        except Exception as e:
            print(f"Error getting WhatsApp stats: {e}")
            # Return mock stats if Supabase query fails
            return {
                'total_sent': random.randint(200, 800),
                'total_delivered': random.randint(190, 780),
                'total_read': random.randint(150, 700),
                'total_replied': random.randint(20, 100),
                'read_rate': round(random.uniform(75, 95), 1),
                'reply_rate': round(random.uniform(10, 20), 1)
            }
    
    def simulate_delivery_status(self, message_id):
        """Simulate delivery status updates for WhatsApp messages"""
        if not self.mock_mode:
            return None
        
        # Simulate delivery status progression
        statuses = ['sent', 'delivered', 'read']
        current_status = random.choice(statuses)
        
        # Update crm_messages with delivery status
        try:
            self.supabase.table('crm_messages').update({
                'status': current_status,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('external_message_id', message_id).execute()
            
            print(f"[MOCK] WhatsApp message {message_id} status updated to: {current_status}")
            return current_status
        except Exception as e:
            print(f"Error updating delivery status: {e}")
            return None
    
    def get_templates(self):
        """Mock WhatsApp templates"""
        if not self.mock_mode:
            return []
        
        return [
            {
                'id': 'welcome_template',
                'name': 'Welcome Message',
                'category': 'MARKETING',
                'language': 'en',
                'components': [
                    {'type': 'BODY', 'text': 'Hi {{name}}, welcome to Future Founders!'}
                ]
            },
            {
                'id': 'payment_reminder',
                'name': 'Payment Reminder',
                'category': 'UTILITY',
                'language': 'en',
                'components': [
                    {'type': 'BODY', 'text': 'Hi {{name}}, this is a reminder for your pending payment of {{amount}}.'}
                ]
            },
            {
                'id': 'class_reminder',
                'name': 'Class Reminder',
                'category': 'UTILITY',
                'language': 'en',
                'components': [
                    {'type': 'BODY', 'text': 'Hi {{name}}, you have a class scheduled at {{time}} today.'}
                ]
            }
        ]