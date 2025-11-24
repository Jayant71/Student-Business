"""
Session-Zoom Integration Helper

Provides unified interface for creating Zoom meetings for sessions.
Supports both manual creation (admin UI) and automated workflows
(payment success webhooks, cron jobs, scheduled tasks).
"""

from datetime import datetime, timedelta
from typing import Optional, Dict
from services.zoom_service import get_zoom_service
from utils.supabase_client import supabase


class SessionZoomIntegration:
    """
    Helper service to integrate Zoom meetings with sessions.
    
    Usage:
    - Admin creates session → calls create_meeting_for_session(source='manual')
    - Payment success webhook → calls create_meeting_for_session(source='webhook')
    - Cron job → calls batch_create_meetings_for_pending_sessions(source='cron')
    """
    
    def __init__(self):
        self.zoom_service = get_zoom_service()
        self.supabase = supabase
    
    def create_meeting_for_session(
        self,
        session_id: str,
        source: str = 'manual',
        custom_settings: Dict = None
    ) -> Dict:
        """
        Create Zoom meeting for a session.
        
        Args:
            session_id: Session UUID
            source: Creation source ('manual', 'webhook', 'cron', 'system')
            custom_settings: Optional custom Zoom meeting settings
        
        Returns:
            dict: Result with success status and meeting details
        """
        try:
            # Fetch session details
            response = self.supabase.table('sessions').select(
                'id, title, description, scheduled_at, duration_minutes, zoom_meeting_id'
            ).eq('id', session_id).single().execute()
            
            if not response.data:
                return {
                    'success': False,
                    'error': f'Session {session_id} not found'
                }
            
            session = response.data
            
            # Check if meeting already exists
            if session.get('zoom_meeting_id'):
                return {
                    'success': False,
                    'error': 'Zoom meeting already exists for this session',
                    'zoom_meeting_id': session['zoom_meeting_id']
                }
            
            # Parse scheduled time
            scheduled_at = datetime.fromisoformat(session['scheduled_at'].replace('Z', '+00:00'))
            
            # Create Zoom meeting
            result = self.zoom_service.create_meeting(
                topic=session['title'],
                start_time=scheduled_at,
                duration_minutes=session.get('duration_minutes', 60),
                agenda=session.get('description', ''),
                settings=custom_settings,
                created_by=source
            )
            
            if not result.get('success'):
                return result
            
            meeting = result['meeting']
            
            # Update session with Zoom details
            update_data = {
                'zoom_meeting_id': meeting['zoom_meeting_id'],
                'zoom_join_url': meeting['zoom_join_url'],
                'zoom_start_url': meeting['zoom_start_url'],
                'zoom_password': meeting.get('zoom_password', ''),
                'zoom_created_at': meeting['created_at'],
                'zoom_created_by': source,
                'zoom_metadata': meeting.get('metadata', {}),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            self.supabase.table('sessions').update(update_data).eq('id', session_id).execute()
            
            print(f"[Session-Zoom] ✓ Meeting created for session {session_id} (source: {source})")
            
            return {
                'success': True,
                'session_id': session_id,
                'zoom_meeting_id': meeting['zoom_meeting_id'],
                'zoom_join_url': meeting['zoom_join_url'],
                'created_by': source
            }
            
        except Exception as e:
            error_msg = f"Failed to create meeting for session: {str(e)}"
            print(f"[Session-Zoom] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def batch_create_meetings_for_pending_sessions(
        self,
        days_ahead: int = 7,
        source: str = 'cron'
    ) -> Dict:
        """
        Batch create Zoom meetings for sessions without meetings.
        Typically called by cron job.
        
        Args:
            days_ahead: Create meetings for sessions scheduled within this many days
            source: Creation source (default: 'cron')
        
        Returns:
            dict: Results with counts of created/failed meetings
        """
        try:
            # Calculate date range
            now = datetime.utcnow()
            end_date = now + timedelta(days=days_ahead)
            
            # Find sessions without Zoom meetings scheduled in the next N days
            response = self.supabase.table('sessions').select(
                'id, title, scheduled_at'
            ).is_('zoom_meeting_id', 'null').gte(
                'scheduled_at', now.isoformat()
            ).lte(
                'scheduled_at', end_date.isoformat()
            ).execute()
            
            sessions = response.data if response.data else []
            
            print(f"[Session-Zoom] Found {len(sessions)} sessions needing Zoom meetings")
            
            results = {
                'total': len(sessions),
                'created': 0,
                'failed': 0,
                'errors': []
            }
            
            for session in sessions:
                result = self.create_meeting_for_session(
                    session_id=session['id'],
                    source=source
                )
                
                if result.get('success'):
                    results['created'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'session_id': session['id'],
                        'title': session['title'],
                        'error': result.get('error')
                    })
            
            print(f"[Session-Zoom] ✓ Batch complete: {results['created']} created, {results['failed']} failed")
            
            return {
                'success': True,
                'results': results
            }
            
        except Exception as e:
            error_msg = f"Batch meeting creation failed: {str(e)}"
            print(f"[Session-Zoom] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def update_meeting_for_session(
        self,
        session_id: str,
        topic: str = None,
        start_time: datetime = None,
        duration_minutes: int = None
    ) -> Dict:
        """
        Update Zoom meeting when session details change.
        
        Args:
            session_id: Session UUID
            topic: New meeting topic
            start_time: New start time
            duration_minutes: New duration
        
        Returns:
            dict: Update result
        """
        try:
            # Fetch session
            response = self.supabase.table('sessions').select(
                'zoom_meeting_id'
            ).eq('id', session_id).single().execute()
            
            if not response.data or not response.data.get('zoom_meeting_id'):
                return {
                    'success': False,
                    'error': 'No Zoom meeting found for this session'
                }
            
            zoom_meeting_id = response.data['zoom_meeting_id']
            
            # Update Zoom meeting
            result = self.zoom_service.update_meeting(
                meeting_id=zoom_meeting_id,
                topic=topic,
                start_time=start_time,
                duration_minutes=duration_minutes
            )
            
            if result.get('success'):
                # Update session metadata
                self.supabase.table('sessions').update({
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', session_id).execute()
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to update meeting: {str(e)}"
            }
    
    def delete_meeting_for_session(self, session_id: str) -> Dict:
        """
        Delete Zoom meeting for a session.
        
        Args:
            session_id: Session UUID
        
        Returns:
            dict: Deletion result
        """
        try:
            # Fetch session
            response = self.supabase.table('sessions').select(
                'zoom_meeting_id'
            ).eq('id', session_id).single().execute()
            
            if not response.data or not response.data.get('zoom_meeting_id'):
                return {
                    'success': False,
                    'error': 'No Zoom meeting found for this session'
                }
            
            zoom_meeting_id = response.data['zoom_meeting_id']
            
            # Delete Zoom meeting
            result = self.zoom_service.delete_meeting(meeting_id=zoom_meeting_id)
            
            if result.get('success'):
                # Clear Zoom fields in session
                self.supabase.table('sessions').update({
                    'zoom_meeting_id': None,
                    'zoom_join_url': None,
                    'zoom_start_url': None,
                    'zoom_password': None,
                    'zoom_created_at': None,
                    'zoom_created_by': None,
                    'zoom_metadata': {},
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('id', session_id).execute()
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Failed to delete meeting: {str(e)}"
            }
    
    def create_meeting_on_payment_success(
        self,
        student_id: str,
        payment_id: str
    ) -> Dict:
        """
        Automated workflow: Create meetings for student's sessions after payment.
        
        Called from payment success webhook.
        
        Args:
            student_id: Student UUID
            payment_id: Payment ID that triggered this
        
        Returns:
            dict: Results of meeting creation
        """
        try:
            # Find student's upcoming sessions without Zoom meetings
            response = self.supabase.table('sessions').select(
                'id, title, scheduled_at'
            ).eq('student_id', student_id).is_(
                'zoom_meeting_id', 'null'
            ).gte(
                'scheduled_at', datetime.utcnow().isoformat()
            ).execute()
            
            sessions = response.data if response.data else []
            
            print(f"[Session-Zoom] Payment {payment_id}: Creating meetings for {len(sessions)} sessions")
            
            results = {
                'total': len(sessions),
                'created': 0,
                'failed': 0,
                'session_ids': []
            }
            
            for session in sessions:
                result = self.create_meeting_for_session(
                    session_id=session['id'],
                    source='webhook'
                )
                
                if result.get('success'):
                    results['created'] += 1
                    results['session_ids'].append(session['id'])
                else:
                    results['failed'] += 1
            
            print(f"[Session-Zoom] ✓ Payment workflow: {results['created']} meetings created")
            
            return {
                'success': True,
                'results': results,
                'triggered_by': f'payment:{payment_id}'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Payment workflow failed: {str(e)}"
            }


# Global singleton instance
_session_zoom_instance = None

def get_session_zoom_integration():
    """Get global SessionZoomIntegration instance"""
    global _session_zoom_instance
    
    if _session_zoom_instance is None:
        _session_zoom_instance = SessionZoomIntegration()
    
    return _session_zoom_instance
