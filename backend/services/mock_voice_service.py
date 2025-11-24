import time
import random
import uuid
from datetime import datetime, timedelta
from utils.supabase_client import supabase
from config import Config

class MockVoiceService:
    """
    Mock Voice Service that mimics Bolna.ai Voice Call API
    
    This service provides development/testing simulation of:
    - Automated voice calls with agent_id and script configuration
    - Call flow simulation (initiated → ringing → connected → completed)
    - Recording generation with mock URLs
    - Call duration and outcome tracking
    - Transcript generation (mock)
    - Transaction logging to database
    
    Response structure matches Bolna.ai API exactly.
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
    
    def _simulate_delay(self, min_sec=0.3, max_sec=1.0):
        """Simulate realistic API response time"""
        time.sleep(random.uniform(min_sec, max_sec))
    
    def _simulate_failure(self, failure_rate=0.05):
        """Simulate occasional API failures"""
        return random.random() < failure_rate
    
    def _generate_call_id(self):
        """Generate Bolna.ai-style call ID"""
        return f"call_{uuid.uuid4().hex[:16]}"
    
    def _generate_recording_url(self, call_id):
        """Generate mock recording URL"""
        return f"https://recordings.bolna.dev/{call_id}.mp3"
    
    def make_call(self, to_number, agent_id, campaign_id=None, metadata=None):
        """
        Mock voice call that simulates Bolna.ai API.
        
        Returns Bolna.ai-compatible response:
        {
            "success": True,
            "call_id": "call_abc123...",
            "agent_id": "agent_xyz",
            "to_number": "+911234567890",
            "status": "initiated",
            "campaign_id": "camp_123",
            "created_at": "2024-01-01T12:00:00Z"
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.4, 0.9)
        
        # Simulate occasional failures (5% failure rate)
        if self._simulate_failure(0.05):
            print(f"[MOCK Bolna.ai] ✗ Failed to initiate call to {to_number}")
            return {
                "success": False,
                "error": "Failed to initiate call",
                "error_code": "V001",
                "details": "Network error or invalid phone number"
            }
        
        call_id = self._generate_call_id()
        internal_id = str(uuid.uuid4())
        
        # Log to call_logs table
        call_data = {
            'id': internal_id,
            'call_id': call_id,
            'to_number': to_number,
            'agent_id': agent_id,
            'campaign_id': campaign_id,
            'status': 'initiated',
            'service': 'mock_bolna',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'custom_metadata': metadata or {},
                'call_type': 'automated_ai'
            }
        }
        
        # Also log to crm_messages for unified view
        crm_data = {
            'id': str(uuid.uuid4()),
            'lead_id': None,  # Would be populated with actual lead ID
            'channel': 'voice',
            'direction': 'outbound',
            'content': f"AI call with agent: {agent_id}",
            'status': 'sent',
            'external_message_id': call_id,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        self._log_to_supabase('call_logs', call_data)
        self._log_to_supabase('crm_messages', crm_data)
        
        # Simulate call progression in background
        self._simulate_call_progression(internal_id, call_id)
        
        print(f"[MOCK Bolna.ai] ✓ Call initiated to {to_number}")
        print(f"[MOCK Bolna.ai] Call ID: {call_id}")
        print(f"[MOCK Bolna.ai] Agent: {agent_id}")
        
        return {
            "success": True,
            "call_id": call_id,
            "internal_id": internal_id,
            "agent_id": agent_id,
            "to_number": to_number,
            "status": "initiated",
            "campaign_id": campaign_id,
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _simulate_call_progression(self, internal_id, call_id):
        """
        Simulate call progression through states:
        initiated → ringing → connected → completed/failed
        """
        # In production, this would be a background job
        # For now, update to ringing immediately
        try:
            # Update to ringing state
            self.supabase.table('call_logs').update({
                'status': 'ringing',
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', internal_id).execute()
            
            # Simulate call answer/completion (would happen after 15-60 seconds)
            # Randomly determine call outcome
            outcomes = [
                ('completed', 0.65),  # 65% - successful call
                ('answered', 0.15),   # 15% - answered but incomplete
                ('no_answer', 0.10),  # 10% - no answer
                ('busy', 0.05),       # 5% - busy
                ('failed', 0.05)      # 5% - technical failure
            ]
            
            outcome_status = random.choices(
                [o[0] for o in outcomes],
                weights=[o[1] for o in outcomes]
            )[0]
            
            # Calculate duration based on outcome
            if outcome_status in ['completed', 'answered']:
                duration = random.randint(45, 420)  # 45 seconds to 7 minutes
                recording_url = self._generate_recording_url(call_id)
            else:
                duration = random.randint(5, 25)  # 5-25 seconds for failed
                recording_url = None
            
            # Build transcript (mock)
            transcript = None
            if outcome_status == 'completed':
                transcript = {
                    'segments': [
                        {'speaker': 'agent', 'text': 'Hello! This is a call regarding your enrollment.', 'timestamp': 0},
                        {'speaker': 'user', 'text': 'Yes, I am interested.', 'timestamp': 5},
                        {'speaker': 'agent', 'text': 'Great! Let me provide you with the details.', 'timestamp': 10}
                    ],
                    'summary': 'Call completed successfully. User expressed interest.',
                    'duration': duration
                }
            
            # Update final status (in real implementation, this would happen after actual call duration)
            final_metadata = {
                'mock_mode': True,
                'call_completed': True,
                'outcome': outcome_status,
                'recording_url': recording_url,
                'transcript': transcript,
                'completed_at': datetime.utcnow().isoformat()
            }
            
            print(f"[MOCK Bolna.ai] ✓ Call {call_id} progression: {outcome_status} (Duration: {duration}s)")
            
        except Exception as e:
            print(f"[MOCK Bolna.ai] Error simulating call progression: {e}")
    
    def make_bulk_calls(self, contacts, agent_id, campaign_id=None):
        """
        Mock bulk voice calling (Bolna.ai format).
        
        Returns:
        {
            "success": True,
            "campaign_id": "camp_123",
            "initiated": 50,
            "failed": 2,
            "call_ids": ["call_abc", "call_def", ...]
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(1.0, 2.5)
        
        results = {
            'success': True,
            'campaign_id': campaign_id or f"camp_{uuid.uuid4().hex[:12]}",
            'initiated': 0,
            'failed': 0,
            'call_ids': []
        }
        
        for contact in contacts:
            phone_number = contact.get('phone_number') or contact.get('phone')
            
            if not phone_number:
                results['failed'] += 1
                continue
            
            call_result = self.make_call(
                phone_number,
                agent_id,
                campaign_id=results['campaign_id'],
                metadata=contact.get('metadata')
            )
            
            if call_result.get('success'):
                results['initiated'] += 1
                results['call_ids'].append(call_result['call_id'])
            else:
                results['failed'] += 1
        
        print(f"[MOCK Bolna.ai] ✓ Bulk campaign completed: {results['initiated']} initiated, {results['failed']} failed")
        return results
    
    def get_call_status(self, call_id):
        """
        Mock call status check (Bolna.ai format).
        
        Returns:
        {
            "success": True,
            "call": {
                "call_id": "call_abc123",
                "status": "completed",
                "to_number": "+911234567890",
                "agent_id": "agent_xyz",
                "duration": 180,
                "recording_url": "https://recordings.bolna.dev/call_abc123.mp3",
                "transcript": {...},
                "created_at": "2024-01-01T12:00:00Z"
            }
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        try:
            response = self.supabase.table('call_logs').select('*').eq('call_id', call_id).execute()
            
            if response.data:
                call = response.data[0]
                return {
                    'success': True,
                    'call': {
                        'call_id': call['call_id'],
                        'status': call['status'],
                        'to_number': call['to_number'],
                        'agent_id': call['agent_id'],
                        'campaign_id': call.get('campaign_id'),
                        'duration': call.get('duration'),
                        'recording_url': call.get('metadata', {}).get('recording_url'),
                        'transcript': call.get('metadata', {}).get('transcript'),
                        'created_at': call['created_at'],
                        'updated_at': call['updated_at']
                    }
                }
            else:
                return {"success": False, "error": "Call not found"}
                
        except Exception as e:
            print(f"[MOCK Bolna.ai] Error getting call status: {e}")
            return {"success": False, "error": str(e)}
    
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
        """Get call statistics from database (Bolna.ai format)"""
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        try:
            response = self.supabase.table('call_logs').select('*').execute()
            
            if response.data:
                calls = response.data
                total_calls = len(calls)
                completed_calls = len([c for c in calls if c['status'] in ['completed', 'answered']])
                failed_calls = len([c for c in calls if c['status'] in ['busy', 'no_answer', 'failed']])
                active_calls = len([c for c in calls if c['status'] in ['initiated', 'ringing', 'connected']])
                
                # Calculate average duration from completed calls
                completed_with_duration = [c for c in calls if c.get('duration') and c['status'] in ['completed', 'answered']]
                avg_duration = sum(c['duration'] for c in completed_with_duration) / len(completed_with_duration) if completed_with_duration else 0
                total_minutes = sum(c.get('duration', 0) for c in calls) / 60
                
                return {
                    'success': True,
                    'total_calls': total_calls,
                    'completed_calls': completed_calls,
                    'failed_calls': failed_calls,
                    'active_calls': active_calls,
                    'success_rate': round((completed_calls / total_calls * 100) if total_calls > 0 else 0, 1),
                    'average_duration_seconds': round(avg_duration, 1),
                    'total_minutes': round(total_minutes, 1),
                    'service': 'mock_bolna'
                }
            else:
                return {
                    'success': True,
                    'total_calls': 0,
                    'completed_calls': 0,
                    'failed_calls': 0,
                    'active_calls': 0,
                    'success_rate': 0,
                    'average_duration_seconds': 0,
                    'total_minutes': 0,
                    'service': 'mock_bolna'
                }
                
        except Exception as e:
            print(f"[MOCK Bolna.ai] Error getting call stats: {e}")
            return {"success": False, "error": str(e)}
    
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