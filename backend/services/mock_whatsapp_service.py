import time
import random
import uuid
from datetime import datetime
from utils.supabase_client import supabase
from config import Config

class MockWhatsAppService:
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
    
    def send_message(self, to_number, template_name, params=None):
        """Mock WhatsApp message sending that logs to Supabase"""
        if not self.mock_mode:
            return False
        
        # Simulate realistic response time
        time.sleep(0.4 + random.uniform(0, 0.8))
        
        # Simulate success/failure scenarios (95% success rate)
        success = random.random() > 0.05
        
        message_id = str(uuid.uuid4())
        
        # Log to whatsapp_logs table
        log_data = {
            'id': message_id,
            'to_number': to_number,
            'template_name': template_name,
            'template_params': params or [],
            'status': 'sent' if success else 'failed',
            'service': 'mock_aisensy',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'simulated_response_time': round(time.time(), 3),
                'campaign_name': 'mock_campaign'
            }
        }
        
        # Also log to crm_messages for unified view
        crm_data = {
            'id': str(uuid.uuid4()),
            'lead_id': None,  # Would be populated with actual lead ID
            'channel': 'whatsapp',
            'direction': 'outbound',
            'content': f"Template: {template_name} - Params: {params}",
            'status': 'sent' if success else 'failed',
            'external_message_id': message_id,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self._log_to_supabase('whatsapp_logs', log_data)
        self._log_to_supabase('crm_messages', crm_data)
        
        if success:
            print(f"[MOCK] WhatsApp message sent successfully to {to_number}")
            print(f"[MOCK] Template: {template_name}")
            print(f"[MOCK] Message ID: {message_id}")
            return True
        else:
            print(f"[MOCK] Failed to send WhatsApp message to {to_number}")
            return False
    
    def send_bulk_messages(self, contacts, template_name, params=None):
        """Mock bulk WhatsApp messaging"""
        if not self.mock_mode:
            return {'sent': 0, 'failed': len(contacts)}
        
        # Simulate bulk processing time
        time.sleep(1.5 + random.uniform(0, 2.5))
        
        results = {'sent': 0, 'failed': 0, 'message_ids': []}
        
        for contact in contacts:
            phone_number = contact.get('phone_number')
            
            success = self.send_message(
                phone_number, 
                template_name, 
                params or contact.get('template_params', [])
            )
            
            if success:
                results['sent'] += 1
                results['message_ids'].append(str(uuid.uuid4()))
            else:
                results['failed'] += 1
        
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