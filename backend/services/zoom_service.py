import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from config import Config
from services.zoom_auth import get_zoom_auth
from utils.supabase_client import supabase

class ZoomService:
    """
    Zoom Meeting Management Service
    
    Handles:
    - Meeting creation (manual and automated)
    - Meeting updates and deletion
    - Recording retrieval
    - Meeting link management
    
    Supports both:
    - Manual creation by admin through UI
    - Automated creation via workflows (payment success, cron jobs, webhooks)
    """
    
    def __init__(self):
        self.zoom_auth = get_zoom_auth()
        self.base_url = "https://api.zoom.us/v2"
    
    def _get_headers(self):
        """Get API request headers with authentication"""
        return {
            'Authorization': f'Bearer {self.zoom_auth.get_access_token()}',
            'Content-Type': 'application/json'
        }
    
    def create_meeting(
        self,
        topic: str,
        start_time: datetime,
        duration_minutes: int = 60,
        agenda: str = None,
        password: str = None,
        settings: Dict = None,
        created_by: str = "system"
    ) -> Dict:
        """
        Create a Zoom meeting.
        
        Can be called from:
        - Admin UI (manual creation)
        - Payment success webhook (automated)
        - Cron jobs (scheduled batch creation)
        - Session scheduling automation
        
        Args:
            topic: Meeting title/topic
            start_time: Meeting start datetime (UTC)
            duration_minutes: Meeting duration in minutes
            agenda: Meeting agenda/description
            password: Optional meeting password
            settings: Custom meeting settings
            created_by: Source of creation ('admin', 'webhook', 'cron', 'system')
        
        Returns:
            dict: Meeting details including join URL and meeting ID
        """
        try:
            # Default settings
            default_settings = {
                'host_video': True,
                'participant_video': True,
                'join_before_host': False,
                'mute_upon_entry': True,
                'waiting_room': True,
                'auto_recording': 'cloud',  # Enable cloud recording
                'approval_type': 0,  # Automatically approve
                'audio': 'both',
                'meeting_authentication': False
            }
            
            # Merge custom settings
            if settings:
                default_settings.update(settings)
            
            # Prepare meeting data
            meeting_data = {
                'topic': topic,
                'type': 2,  # Scheduled meeting
                'start_time': start_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'duration': duration_minutes,
                'timezone': 'UTC',
                'agenda': agenda or f"Business training session: {topic}",
                'settings': default_settings
            }
            
            # Add password if provided
            if password:
                meeting_data['password'] = password
            
            print(f"[Zoom Service] Creating meeting: {topic} ({created_by})")
            print(f"[Zoom Service] Start time: {start_time.isoformat()}")
            
            # Create meeting via Zoom API
            response = requests.post(
                f"{self.base_url}/users/me/meetings",
                headers=self._get_headers(),
                json=meeting_data,
                timeout=15
            )
            
            response.raise_for_status()
            meeting = response.json()
            
            # Extract meeting details
            meeting_info = {
                'zoom_meeting_id': str(meeting['id']),
                'zoom_join_url': meeting['join_url'],
                'zoom_start_url': meeting['start_url'],
                'zoom_password': meeting.get('password', ''),
                'topic': meeting['topic'],
                'start_time': meeting['start_time'],
                'duration': meeting['duration'],
                'status': 'scheduled',
                'created_by': created_by,
                'created_at': datetime.utcnow().isoformat(),
                'metadata': {
                    'zoom_uuid': meeting.get('uuid'),
                    'host_id': meeting.get('host_id'),
                    'timezone': meeting.get('timezone'),
                    'agenda': meeting.get('agenda')
                }
            }
            
            print(f"[Zoom Service] ✓ Meeting created successfully")
            print(f"[Zoom Service] Meeting ID: {meeting_info['zoom_meeting_id']}")
            print(f"[Zoom Service] Join URL: {meeting_info['zoom_join_url']}")
            
            return {
                'success': True,
                'meeting': meeting_info
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"Zoom API error: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data.get('message', 'Unknown error')}"
            except:
                pass
            
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
            
        except Exception as e:
            error_msg = f"Failed to create Zoom meeting: {str(e)}"
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def update_meeting(
        self,
        meeting_id: str,
        topic: str = None,
        start_time: datetime = None,
        duration_minutes: int = None,
        agenda: str = None,
        settings: Dict = None
    ) -> Dict:
        """
        Update an existing Zoom meeting.
        
        Args:
            meeting_id: Zoom meeting ID
            topic: New meeting topic (optional)
            start_time: New start time (optional)
            duration_minutes: New duration (optional)
            agenda: New agenda (optional)
            settings: Updated meeting settings (optional)
        
        Returns:
            dict: Update status
        """
        try:
            update_data = {}
            
            if topic:
                update_data['topic'] = topic
            
            if start_time:
                update_data['start_time'] = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            if duration_minutes:
                update_data['duration'] = duration_minutes
            
            if agenda:
                update_data['agenda'] = agenda
            
            if settings:
                update_data['settings'] = settings
            
            if not update_data:
                return {
                    'success': False,
                    'error': 'No update data provided'
                }
            
            print(f"[Zoom Service] Updating meeting: {meeting_id}")
            
            response = requests.patch(
                f"{self.base_url}/meetings/{meeting_id}",
                headers=self._get_headers(),
                json=update_data,
                timeout=15
            )
            
            response.raise_for_status()
            
            print(f"[Zoom Service] ✓ Meeting updated successfully")
            
            return {
                'success': True,
                'meeting_id': meeting_id,
                'updated_fields': list(update_data.keys())
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"Failed to update meeting: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data.get('message', 'Unknown error')}"
            except:
                pass
            
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
            
        except Exception as e:
            error_msg = f"Error updating Zoom meeting: {str(e)}"
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def delete_meeting(self, meeting_id: str) -> Dict:
        """
        Delete a Zoom meeting.
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            dict: Deletion status
        """
        try:
            print(f"[Zoom Service] Deleting meeting: {meeting_id}")
            
            response = requests.delete(
                f"{self.base_url}/meetings/{meeting_id}",
                headers=self._get_headers(),
                timeout=15
            )
            
            response.raise_for_status()
            
            print(f"[Zoom Service] ✓ Meeting deleted successfully")
            
            return {
                'success': True,
                'meeting_id': meeting_id
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"Failed to delete meeting: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data.get('message', 'Unknown error')}"
            except:
                pass
            
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
            
        except Exception as e:
            error_msg = f"Error deleting Zoom meeting: {str(e)}"
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def get_meeting(self, meeting_id: str) -> Dict:
        """
        Get meeting details.
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            dict: Meeting details
        """
        try:
            response = requests.get(
                f"{self.base_url}/meetings/{meeting_id}",
                headers=self._get_headers(),
                timeout=15
            )
            
            response.raise_for_status()
            meeting = response.json()
            
            return {
                'success': True,
                'meeting': {
                    'id': str(meeting['id']),
                    'uuid': meeting.get('uuid'),
                    'topic': meeting['topic'],
                    'start_time': meeting['start_time'],
                    'duration': meeting['duration'],
                    'join_url': meeting['join_url'],
                    'start_url': meeting.get('start_url'),
                    'password': meeting.get('password'),
                    'status': meeting.get('status', 'scheduled'),
                    'timezone': meeting.get('timezone')
                }
            }
            
        except requests.exceptions.HTTPError as e:
            error_msg = f"Failed to get meeting: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data.get('message', 'Unknown error')}"
            except:
                pass
            
            return {
                'success': False,
                'error': error_msg
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Error getting Zoom meeting: {str(e)}"
            }
    
    def get_meeting_recordings(self, meeting_id: str) -> Dict:
        """
        Get recordings for a meeting.
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            dict: Recording details including download URLs
        """
        try:
            print(f"[Zoom Service] Fetching recordings for meeting: {meeting_id}")
            
            response = requests.get(
                f"{self.base_url}/meetings/{meeting_id}/recordings",
                headers=self._get_headers(),
                timeout=15
            )
            
            response.raise_for_status()
            data = response.json()
            
            recordings = []
            if 'recording_files' in data:
                for recording in data['recording_files']:
                    recordings.append({
                        'id': recording.get('id'),
                        'meeting_id': recording.get('meeting_id'),
                        'recording_start': recording.get('recording_start'),
                        'recording_end': recording.get('recording_end'),
                        'file_type': recording.get('file_type'),
                        'file_size': recording.get('file_size'),
                        'download_url': recording.get('download_url'),
                        'play_url': recording.get('play_url'),
                        'status': recording.get('status'),
                        'recording_type': recording.get('recording_type')
                    })
            
            print(f"[Zoom Service] ✓ Found {len(recordings)} recording(s)")
            
            return {
                'success': True,
                'meeting_id': meeting_id,
                'recordings': recordings,
                'total_size': data.get('total_records', len(recordings))
            }
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                # No recordings found
                return {
                    'success': True,
                    'meeting_id': meeting_id,
                    'recordings': [],
                    'message': 'No recordings available yet'
                }
            
            error_msg = f"Failed to get recordings: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data.get('message', 'Unknown error')}"
            except:
                pass
            
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
            
        except Exception as e:
            error_msg = f"Error getting Zoom recordings: {str(e)}"
            print(f"[Zoom Service] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def list_user_meetings(self, page_size: int = 30) -> Dict:
        """
        List all meetings for the authenticated user.
        
        Args:
            page_size: Number of meetings to return (max 300)
        
        Returns:
            dict: List of meetings
        """
        try:
            response = requests.get(
                f"{self.base_url}/users/me/meetings",
                headers=self._get_headers(),
                params={'page_size': min(page_size, 300)},
                timeout=15
            )
            
            response.raise_for_status()
            data = response.json()
            
            meetings = []
            if 'meetings' in data:
                for meeting in data['meetings']:
                    meetings.append({
                        'id': str(meeting['id']),
                        'uuid': meeting.get('uuid'),
                        'topic': meeting['topic'],
                        'start_time': meeting.get('start_time'),
                        'duration': meeting.get('duration'),
                        'join_url': meeting.get('join_url'),
                        'type': meeting.get('type'),
                        'status': meeting.get('status')
                    })
            
            return {
                'success': True,
                'meetings': meetings,
                'total': len(meetings)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Error listing meetings: {str(e)}"
            }


# Global singleton instance
_zoom_service_instance = None

def get_zoom_service():
    """
    Get global ZoomService instance (singleton pattern).
    Uses mock service if USE_MOCK_ZOOM is enabled.
    
    Returns:
        ZoomService or MockZoomService: Zoom service instance
    """
    global _zoom_service_instance
    
    if _zoom_service_instance is None:
        # Check if mock mode is enabled
        if Config.USE_MOCK_ZOOM:
            from services.mock_zoom_service import get_mock_zoom_service
            print("[Zoom Service] Using MOCK Zoom service (no real API calls)")
            _zoom_service_instance = get_mock_zoom_service()
        else:
            print("[Zoom Service] Using REAL Zoom API")
            _zoom_service_instance = ZoomService()
    
    return _zoom_service_instance
