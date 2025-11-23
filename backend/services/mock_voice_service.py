import time
import random
import uuid
from datetime import datetime, timedelta
from utils.supabase_client import supabase
from config import Config

class MockVoiceService:
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
    
    def make_call(self, to_number, script_id, agent_id=None):
        """Mock voice call that simulates Bolna.ai"""
        if not self.mock_mode:
            return False
        
        # Simulate realistic response time
        time.sleep(0.5 + random.uniform(0, 0.8))
        
        # Simulate success/failure scenarios (90% success rate)
        success = random.random() > 0.1
        
        call_id = str(uuid.uuid4())
        
        # Log to call_logs table
        call_data = {
            'id': call_id,
            'to_number': to_number,
            'script_id': script_id,
            'agent_id': agent_id or script_id,
            'status': 'initiated' if success else 'failed',
            'service': 'mock_bolna',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'simulated_response_time': round(time.time(), 3),
                'call_type': 'automated'
            }
        }
        
        # Also log to crm_messages for unified view
        crm_data = {
            'id': str(uuid.uuid4()),
            'lead_id': None,  # Would be populated with actual lead ID
            'channel': 'voice',
            'direction': 'outbound',
            'content': f"Automated call using script: {script_id}",
            'status': 'sent' if success else 'failed',
            'external_message_id': call_id,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self._log_to_supabase('call_logs', call_data)
        self._log_to_supabase('crm_messages', crm_data)
        
        if success:
            # Simulate call progression after a delay
            self._simulate_call_progression(call_id)
            
            print(f"[MOCK] Voice call initiated successfully to {to_number}")
            print(f"[MOCK] Script ID: {script_id}")
            print(f"[MOCK] Call ID: {call_id}")
            return True
        else:
            print(f"[MOCK] Failed to initiate voice call to {to_number}")
            return False
    
    def _simulate_call_progression(self, call_id):
        """Simulate call progression (connected -> completed)"""
        def update_call_status():
            time.sleep(random.uniform(5, 15))  # Simulate call duration
            
            try:
                # Randomly determine call outcome
                outcomes = ['completed', 'answered', 'busy', 'no_answer']
                weights = [0.6, 0.2, 0.1, 0.1]
                final_status = random.choices(outcomes, weights=weights)[0]
                
                # Calculate call duration
                if final_status in ['completed', 'answered']:
                    duration = random.randint(30, 300)  # 30 seconds to 5 minutes
                else:
                    duration = random.randint(5, 30)   # 5-30 seconds for failed calls
                
                update_data = {
                    'status': final_status,
                    'duration': duration,
                    'updated_at': datetime.utcnow().isoformat(),
                    'metadata': {
                        'call_completed': True,
                        'simulated_duration': duration
                    }
                }
                
                self.supabase.table('call_logs').update(update_data).eq('id', call_id).execute()
                
                # Update CRM message status
                self.supabase.table('crm_messages').update({
                    'status': 'delivered' if final_status in ['completed', 'answered'] else 'failed',
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('external_message_id', call_id).execute()
                
                print(f"[MOCK] Call {call_id} completed with status: {final_status} (Duration: {duration}s)")
                
            except Exception as e:
                print(f"Error updating call progression: {e}")
        
        # Run in background (in a real implementation, this would be a background task)
        # For now, we'll just update immediately to a connected state
        try:
            self.supabase.table('call_logs').update({
                'status': 'connected',
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', call_id).execute()
        except Exception as e:
            print(f"Error updating call status: {e}")
    
    def make_bulk_calls(self, contacts, script_id):
        """Mock bulk voice calling"""
        if not self.mock_mode:
            return {'initiated': 0, 'failed': len(contacts)}
        
        # Simulate bulk processing time
        time.sleep(1 + random.uniform(0, 2))
        
        results = {'initiated': 0, 'failed': 0, 'call_ids': []}
        
        for contact in contacts:
            phone_number = contact.get('phone_number')
            
            success = self.make_call(
                phone_number, 
                script_id,
                contact.get('agent_id')
            )
            
            if success:
                results['initiated'] += 1
                results['call_ids'].append(str(uuid.uuid4()))
            else:
                results['failed'] += 1
        
        print(f"[MOCK] Bulk calling completed: {results['initiated']} initiated, {results['failed']} failed")
        return results
    
    def get_call_status(self, call_id):
        """Mock call status check"""
        if not self.mock_mode:
            return None
        
        try:
            response = self.supabase.table('call_logs').select('*').eq('id', call_id).execute()
            
            if response.data:
                call = response.data[0]
                return {
                    'id': call['id'],
                    'status': call['status'],
                    'to_number': call['to_number'],
                    'duration': call.get('duration'),
                    'created_at': call['created_at']
                }
            else:
                return None
                
        except Exception as e:
            print(f"Error getting call status: {e}")
            return None
    
    def get_call_logs(self, limit=10, status=None):
        """Mock call logs listing"""
        if not self.mock_mode:
            return []
        
        try:
            query = self.supabase.table('call_logs').select('*').order('created_at', desc=True).limit(limit)
            
            if status:
                query = query.eq('status', status)
            
            response = query.execute()
            
            if response.data:
                return [
                    {
                        'id': call['id'],
                        'to_number': call['to_number'],
                        'script_id': call['script_id'],
                        'status': call['status'],
                        'duration': call.get('duration'),
                        'created_at': call['created_at']
                    }
                    for call in response.data
                ]
            else:
                # Return mock data if no real data
                return self._generate_mock_call_logs(limit)
                
        except Exception as e:
            print(f"Error getting call logs: {e}")
            return self._generate_mock_call_logs(limit)
    
    def _generate_mock_call_logs(self, count):
        """Generate mock call logs for testing"""
        mock_logs = []
        for i in range(count):
            call_id = str(uuid.uuid4())
            status = random.choice(['completed', 'answered', 'busy', 'no_answer', 'failed'])
            
            if status in ['completed', 'answered']:
                duration = random.randint(30, 300)
            else:
                duration = random.randint(5, 30)
            
            mock_logs.append({
                'id': call_id,
                'to_number': f"+123456789{i+1}",
                'script_id': f"script_{random.randint(1, 5)}",
                'status': status,
                'duration': duration,
                'created_at': (datetime.utcnow() - timedelta(hours=random.randint(0, 72))).isoformat()
            })
        return mock_logs
    
    def get_call_stats(self):
        """Mock call statistics"""
        if not self.mock_mode:
            return None
        
        try:
            # Get actual stats from Supabase if available
            response = self.supabase.table('call_logs').select('*').execute()
            
            if response.data:
                calls = response.data
                total_calls = len(calls)
                completed_calls = len([c for c in calls if c['status'] in ['completed', 'answered']])
                failed_calls = len([c for c in calls if c['status'] in ['busy', 'no_answer', 'failed']])
                
                # Calculate average duration
                completed_with_duration = [c for c in calls if c.get('duration') and c['status'] in ['completed', 'answered']]
                avg_duration = sum(c['duration'] for c in completed_with_duration) / len(completed_with_duration) if completed_with_duration else 0
                
                return {
                    'total_calls': total_calls,
                    'completed_calls': completed_calls,
                    'failed_calls': failed_calls,
                    'success_rate': round((completed_calls / total_calls * 100) if total_calls > 0 else 0, 1),
                    'average_duration': round(avg_duration, 1),
                    'total_minutes': round(sum(c.get('duration', 0) for c in calls) / 60, 1)
                }
            else:
                # Return mock stats if no real data
                return self._generate_mock_stats()
                
        except Exception as e:
            print(f"Error getting call stats: {e}")
            return self._generate_mock_stats()
    
    def _generate_mock_stats(self):
        """Generate mock call statistics"""
        total_calls = random.randint(50, 200)
        completed_calls = int(total_calls * random.uniform(0.7, 0.9))
        failed_calls = total_calls - completed_calls
        
        avg_duration = random.uniform(60, 180)  # 1-3 minutes average
        
        return {
            'total_calls': total_calls,
            'completed_calls': completed_calls,
            'failed_calls': failed_calls,
            'success_rate': round((completed_calls / total_calls * 100) if total_calls > 0 else 0, 1),
            'average_duration': round(avg_duration, 1),
            'total_minutes': round((completed_calls * avg_duration) / 60, 1)
        }
    
    def get_available_scripts(self):
        """Mock available call scripts"""
        if not self.mock_mode:
            return []
        
        return [
            {
                'id': 'welcome_script',
                'name': 'Welcome Call',
                'description': 'Welcome call for new students',
                'duration': '2-3 minutes',
                'language': 'en'
            },
            {
                'id': 'followup_script',
                'name': 'Follow Up Call',
                'description': 'Follow up call for payment reminders',
                'duration': '1-2 minutes',
                'language': 'en'
            },
            {
                'id': 'reminder_script',
                'name': 'Class Reminder',
                'description': 'Automated class reminder call',
                'duration': '30 seconds',
                'language': 'en'
            },
            {
                'id': 'feedback_script',
                'name': 'Feedback Collection',
                'description': 'Collect feedback after course completion',
                'duration': '3-5 minutes',
                'language': 'en'
            }
        ]
    
    def create_campaign(self, campaign_name, contacts, script_id, scheduled_time=None):
        """Mock voice campaign creation"""
        if not self.mock_mode:
            return None
        
        # Simulate campaign creation time
        time.sleep(0.3 + random.uniform(0, 0.4))
        
        campaign_id = str(uuid.uuid4())
        
        # Log campaign data
        campaign_data = {
            'id': campaign_id,
            'name': campaign_name,
            'script_id': script_id,
            'contacts_count': len(contacts),
            'initiated_count': 0,
            'completed_count': 0,
            'status': 'scheduled' if scheduled_time else 'created',
            'scheduled_time': scheduled_time,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'service': 'mock_bolna'
            }
        }
        
        self._log_to_supabase('call_campaigns', campaign_data)
        
        print(f"[MOCK] Voice campaign created: {campaign_name}")
        print(f"[MOCK] Campaign ID: {campaign_id}")
        print(f"[MOCK] Contacts: {len(contacts)}")
        print(f"[MOCK] Script: {script_id}")
        
        return {
            'campaign_id': campaign_id,
            'name': campaign_name,
            'status': campaign_data['status'],
            'contacts_count': len(contacts),
            'script_id': script_id
        }
    
    def simulate_call_recording(self, call_id):
        """Simulate call recording generation"""
        if not self.mock_mode:
            return None
        
        try:
            # Generate mock recording URL
            recording_url = f"https://mock-recordings.bolna.ai/{call_id}.mp3"
            
            # Update call log with recording URL
            self.supabase.table('call_logs').update({
                'recording_url': recording_url,
                'updated_at': datetime.utcnow().isoformat(),
                'metadata': {
                    'recording_generated': True,
                    'mock_recording': True
                }
            }).eq('id', call_id).execute()
            
            print(f"[MOCK] Call recording generated for {call_id}: {recording_url}")
            
            return {
                'call_id': call_id,
                'recording_url': recording_url,
                'duration': random.randint(30, 300)
            }
            
        except Exception as e:
            print(f"Error generating call recording: {e}")
            return None