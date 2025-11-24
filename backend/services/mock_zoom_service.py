"""
Mock Zoom Service for Development/Testing
==========================================

Simulates Zoom API behavior without making real API calls.
Useful for local development, testing, and environments without Zoom credentials.

Features:
- In-memory meeting storage
- Realistic response structures matching Zoom API v2
- Simulated recording generation after meeting "ends"
- Status transitions (waiting -> started -> ended)
- Error simulation for edge cases
- No external dependencies required

Usage:
------
# In config.py, set:
USE_MOCK_ZOOM = True  # Enable mock mode

# Services automatically use mock when enabled
from services.zoom_service import get_zoom_service
zoom = get_zoom_service()  # Returns MockZoomService if USE_MOCK_ZOOM=True

Mock Data:
----------
- Meetings stored in memory (cleared on restart)
- Auto-generates meeting IDs (9 digits)
- Auto-generates join URLs with mock meeting IDs
- Recordings created 2 hours after meeting "end time"
- Realistic status transitions
"""

import uuid
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict


@dataclass
class MockRecording:
    """Mock Zoom recording object"""
    recording_id: str
    meeting_id: str
    recording_start: str
    recording_end: str
    file_type: str
    file_size: int
    download_url: str
    play_url: str
    recording_type: str
    status: str = "completed"
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MockMeeting:
    """Mock Zoom meeting object"""
    id: str  # Zoom meeting ID (9 digits)
    uuid: str  # Meeting UUID
    host_id: str
    topic: str
    type: int  # 2=scheduled, 3=recurring
    start_time: str  # ISO 8601
    duration: int  # minutes
    timezone: str
    status: str  # waiting, started, ended
    start_url: str
    join_url: str
    password: str
    created_at: str
    created_by: str  # manual, webhook, cron, system
    settings: Dict[str, Any] = field(default_factory=dict)
    recordings: List[MockRecording] = field(default_factory=list)
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to Zoom API response format"""
        return {
            "id": self.id,
            "uuid": self.uuid,
            "host_id": self.host_id,
            "topic": self.topic,
            "type": self.type,
            "start_time": self.start_time,
            "duration": self.duration,
            "timezone": self.timezone,
            "status": self.status,
            "start_url": self.start_url,
            "join_url": self.join_url,
            "password": self.password,
            "created_at": self.created_at,
            "settings": self.settings
        }


class MockZoomService:
    """
    Mock Zoom service that simulates Zoom API behavior.
    Stores meetings in memory and generates realistic responses.
    """
    
    def __init__(self):
        self.meetings: Dict[str, MockMeeting] = {}  # meeting_id -> MockMeeting
        self.host_id = "mock_host_12345"
        print("[Mock Zoom] Initialized - No real API calls will be made")
    
    def _generate_meeting_id(self) -> str:
        """Generate realistic 9-11 digit meeting ID"""
        return ''.join(random.choices(string.digits, k=random.choice([9, 10, 11])))
    
    def _generate_password(self) -> str:
        """Generate 6-character meeting password"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    
    def _generate_uuid(self) -> str:
        """Generate meeting UUID"""
        return str(uuid.uuid4())
    
    def _get_join_url(self, meeting_id: str, password: str) -> str:
        """Generate mock join URL"""
        return f"https://zoom.us/j/{meeting_id}?pwd={password}"
    
    def _get_start_url(self, meeting_id: str) -> str:
        """Generate mock start URL"""
        token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
        return f"https://zoom.us/s/{meeting_id}?zak={token}"
    
    def _update_meeting_status(self, meeting: MockMeeting) -> None:
        """Auto-update meeting status based on time"""
        now = datetime.utcnow()
        start_time = datetime.fromisoformat(meeting.start_time.replace('Z', '+00:00'))
        end_time = start_time + timedelta(minutes=meeting.duration)
        
        if now < start_time:
            meeting.status = "waiting"
        elif start_time <= now <= end_time + timedelta(minutes=30):
            if meeting.status == "waiting":
                meeting.actual_start_time = now.isoformat() + 'Z'
            meeting.status = "started"
        else:
            if meeting.status == "started" and not meeting.actual_end_time:
                meeting.actual_end_time = now.isoformat() + 'Z'
                # Generate recordings 2 hours after meeting ends
                self._generate_recordings(meeting)
            meeting.status = "ended"
    
    def _generate_recordings(self, meeting: MockMeeting) -> None:
        """Generate mock recordings for ended meeting"""
        if meeting.recordings:
            return  # Already generated
        
        recording_start = meeting.actual_start_time or meeting.start_time
        duration_mins = meeting.duration
        recording_end_dt = datetime.fromisoformat(recording_start.replace('Z', '+00:00')) + timedelta(minutes=duration_mins)
        recording_end = recording_end_dt.isoformat() + 'Z'
        
        # Generate multiple recording files (like real Zoom)
        recordings = [
            MockRecording(
                recording_id=f"REC_{uuid.uuid4().hex[:16].upper()}",
                meeting_id=meeting.id,
                recording_start=recording_start,
                recording_end=recording_end,
                file_type="MP4",
                file_size=random.randint(50_000_000, 500_000_000),  # 50MB-500MB
                download_url=f"https://zoom.us/rec/download/mock_{meeting.id}_video.mp4",
                play_url=f"https://zoom.us/rec/play/mock_{meeting.id}_video",
                recording_type="shared_screen_with_speaker_view",
                status="completed"
            ),
            MockRecording(
                recording_id=f"REC_{uuid.uuid4().hex[:16].upper()}",
                meeting_id=meeting.id,
                recording_start=recording_start,
                recording_end=recording_end,
                file_type="M4A",
                file_size=random.randint(5_000_000, 20_000_000),  # 5MB-20MB
                download_url=f"https://zoom.us/rec/download/mock_{meeting.id}_audio.m4a",
                play_url=f"https://zoom.us/rec/play/mock_{meeting.id}_audio",
                recording_type="audio_only",
                status="completed"
            ),
            MockRecording(
                recording_id=f"REC_{uuid.uuid4().hex[:16].upper()}",
                meeting_id=meeting.id,
                recording_start=recording_start,
                recording_end=recording_end,
                file_type="CHAT",
                file_size=random.randint(1_000, 50_000),  # 1KB-50KB
                download_url=f"https://zoom.us/rec/download/mock_{meeting.id}_chat.txt",
                play_url=f"https://zoom.us/rec/download/mock_{meeting.id}_chat.txt",
                recording_type="chat_file",
                status="completed"
            )
        ]
        
        meeting.recordings = recordings
        print(f"[Mock Zoom] Generated {len(recordings)} recording(s) for meeting {meeting.id}")
    
    def create_meeting(
        self,
        topic: str,
        start_time: datetime,
        duration_minutes: int,
        agenda: Optional[str] = None,
        timezone: str = "UTC",
        password: Optional[str] = None,
        created_by: str = "manual",
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a mock Zoom meeting
        
        Args:
            topic: Meeting title
            start_time: When meeting starts (datetime object)
            duration_minutes: Meeting duration
            agenda: Meeting description (optional)
            timezone: Timezone (default: UTC)
            password: Custom password (auto-generated if not provided)
            created_by: Source: manual, webhook, cron, system
            settings: Meeting settings dict (optional)
        
        Returns:
            Dict with success=True and meeting details
        """
        try:
            meeting_id = self._generate_meeting_id()
            meeting_uuid = self._generate_uuid()
            meeting_password = password or self._generate_password()
            
            # Default settings matching real Zoom
            default_settings = {
                "host_video": True,
                "participant_video": True,
                "cn_meeting": False,
                "in_meeting": False,
                "join_before_host": False,
                "jbh_time": 0,
                "mute_upon_entry": True,
                "watermark": False,
                "use_pmi": False,
                "approval_type": 0,  # Auto-approve
                "audio": "both",
                "auto_recording": "cloud",
                "enforce_login": False,
                "waiting_room": True,
                "meeting_authentication": False
            }
            
            if settings:
                default_settings.update(settings)
            
            meeting = MockMeeting(
                id=meeting_id,
                uuid=meeting_uuid,
                host_id=self.host_id,
                topic=topic,
                type=2,  # Scheduled meeting
                start_time=start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                duration=duration_minutes,
                timezone=timezone,
                status="waiting",
                start_url=self._get_start_url(meeting_id),
                join_url=self._get_join_url(meeting_id, meeting_password),
                password=meeting_password,
                created_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                created_by=created_by,
                settings=default_settings
            )
            
            self.meetings[meeting_id] = meeting
            
            print(f"[Mock Zoom] ✓ Created meeting: {meeting_id} - '{topic}' (created_by: {created_by})")
            print(f"[Mock Zoom]   Join URL: {meeting.join_url}")
            print(f"[Mock Zoom]   Password: {meeting_password}")
            print(f"[Mock Zoom]   Start Time: {meeting.start_time}")
            
            return {
                "success": True,
                "meeting": meeting.to_dict(),
                "zoom_meeting_id": meeting_id,
                "zoom_join_url": meeting.join_url,
                "zoom_start_url": meeting.start_url,
                "zoom_password": meeting_password,
                "created_by": created_by
            }
            
        except Exception as e:
            print(f"[Mock Zoom] ✗ Error creating meeting: {str(e)}")
            return {
                "success": False,
                "error": f"Mock meeting creation failed: {str(e)}"
            }
    
    def get_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """
        Get meeting details
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            Dict with success=True and meeting details or error
        """
        try:
            if meeting_id not in self.meetings:
                return {
                    "success": False,
                    "error": f"Meeting {meeting_id} not found",
                    "error_code": 3001
                }
            
            meeting = self.meetings[meeting_id]
            self._update_meeting_status(meeting)
            
            print(f"[Mock Zoom] ✓ Retrieved meeting: {meeting_id} (status: {meeting.status})")
            
            return {
                "success": True,
                "meeting": meeting.to_dict()
            }
            
        except Exception as e:
            print(f"[Mock Zoom] ✗ Error getting meeting: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to get meeting: {str(e)}"
            }
    
    def update_meeting(
        self,
        meeting_id: str,
        topic: Optional[str] = None,
        start_time: Optional[datetime] = None,
        duration_minutes: Optional[int] = None,
        agenda: Optional[str] = None,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update existing meeting
        
        Args:
            meeting_id: Zoom meeting ID
            topic: New meeting title (optional)
            start_time: New start time (optional)
            duration_minutes: New duration (optional)
            agenda: New description (optional)
            settings: Updated settings (optional)
        
        Returns:
            Dict with success=True or error
        """
        try:
            if meeting_id not in self.meetings:
                return {
                    "success": False,
                    "error": f"Meeting {meeting_id} not found",
                    "error_code": 3001
                }
            
            meeting = self.meetings[meeting_id]
            
            # Update fields
            if topic:
                meeting.topic = topic
            if start_time:
                meeting.start_time = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
            if duration_minutes:
                meeting.duration = duration_minutes
            if settings:
                meeting.settings.update(settings)
            
            self._update_meeting_status(meeting)
            
            print(f"[Mock Zoom] ✓ Updated meeting: {meeting_id}")
            
            return {
                "success": True,
                "meeting": meeting.to_dict()
            }
            
        except Exception as e:
            print(f"[Mock Zoom] ✗ Error updating meeting: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to update meeting: {str(e)}"
            }
    
    def delete_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """
        Delete meeting
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            Dict with success=True or error
        """
        try:
            if meeting_id not in self.meetings:
                return {
                    "success": False,
                    "error": f"Meeting {meeting_id} not found",
                    "error_code": 3001
                }
            
            del self.meetings[meeting_id]
            
            print(f"[Mock Zoom] ✓ Deleted meeting: {meeting_id}")
            
            return {
                "success": True,
                "message": f"Meeting {meeting_id} deleted successfully"
            }
            
        except Exception as e:
            print(f"[Mock Zoom] ✗ Error deleting meeting: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to delete meeting: {str(e)}"
            }
    
    def list_meetings(
        self,
        type: str = "scheduled",
        page_size: int = 30,
        page_number: int = 1
    ) -> Dict[str, Any]:
        """
        List all meetings
        
        Args:
            type: Meeting type filter (scheduled, live, upcoming)
            page_size: Results per page
            page_number: Page number
        
        Returns:
            Dict with success=True and meetings list
        """
        try:
            # Update all meeting statuses
            for meeting in self.meetings.values():
                self._update_meeting_status(meeting)
            
            # Filter by type
            filtered = []
            for meeting in self.meetings.values():
                if type == "live" and meeting.status == "started":
                    filtered.append(meeting)
                elif type == "upcoming" and meeting.status == "waiting":
                    filtered.append(meeting)
                else:  # scheduled = all
                    filtered.append(meeting)
            
            # Pagination
            start_idx = (page_number - 1) * page_size
            end_idx = start_idx + page_size
            page_meetings = filtered[start_idx:end_idx]
            
            print(f"[Mock Zoom] ✓ Listed {len(page_meetings)} meeting(s) (type: {type})")
            
            return {
                "success": True,
                "page_count": (len(filtered) + page_size - 1) // page_size,
                "page_number": page_number,
                "page_size": page_size,
                "total_records": len(filtered),
                "meetings": [m.to_dict() for m in page_meetings]
            }
            
        except Exception as e:
            print(f"[Mock Zoom] ✗ Error listing meetings: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to list meetings: {str(e)}"
            }
    
    def get_meeting_recordings(self, meeting_id: str) -> Dict[str, Any]:
        """
        Get recordings for a meeting
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            Dict with success=True and recordings list or error
        """
        try:
            if meeting_id not in self.meetings:
                return {
                    "success": False,
                    "error": f"Meeting {meeting_id} not found",
                    "error_code": 3001
                }
            
            meeting = self.meetings[meeting_id]
            self._update_meeting_status(meeting)
            
            # Recordings only available after meeting ends
            if meeting.status != "ended":
                print(f"[Mock Zoom] ⏳ No recordings yet for meeting {meeting_id} (status: {meeting.status})")
                return {
                    "success": True,
                    "recordings": [],
                    "total_records": 0,
                    "message": "Meeting has not ended yet"
                }
            
            # Auto-generate recordings if not already created
            if not meeting.recordings:
                self._generate_recordings(meeting)
            
            print(f"[Mock Zoom] ✓ Retrieved {len(meeting.recordings)} recording(s) for meeting {meeting_id}")
            
            return {
                "success": True,
                "uuid": meeting.uuid,
                "id": meeting.id,
                "account_id": self.host_id,
                "host_id": self.host_id,
                "topic": meeting.topic,
                "start_time": meeting.start_time,
                "duration": meeting.duration,
                "total_size": sum(r.file_size for r in meeting.recordings),
                "recording_count": len(meeting.recordings),
                "recording_files": [r.to_dict() for r in meeting.recordings]
            }
            
        except Exception as e:
            print(f"[Mock Zoom] ✗ Error getting recordings: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to get recordings: {str(e)}"
            }
    
    def simulate_meeting_end(self, meeting_id: str) -> Dict[str, Any]:
        """
        Force meeting to end (for testing)
        
        Args:
            meeting_id: Zoom meeting ID
        
        Returns:
            Dict with success status
        """
        try:
            if meeting_id not in self.meetings:
                return {
                    "success": False,
                    "error": f"Meeting {meeting_id} not found"
                }
            
            meeting = self.meetings[meeting_id]
            meeting.status = "ended"
            meeting.actual_end_time = datetime.utcnow().isoformat() + 'Z'
            self._generate_recordings(meeting)
            
            print(f"[Mock Zoom] ✓ Simulated meeting end: {meeting_id}")
            print(f"[Mock Zoom]   Generated {len(meeting.recordings)} recording(s)")
            
            return {
                "success": True,
                "message": f"Meeting {meeting_id} ended and recordings generated"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to simulate meeting end: {str(e)}"
            }
    
    def clear_all_meetings(self) -> Dict[str, Any]:
        """Clear all meetings (for testing/cleanup)"""
        count = len(self.meetings)
        self.meetings.clear()
        print(f"[Mock Zoom] ✓ Cleared {count} meeting(s)")
        return {
            "success": True,
            "message": f"Cleared {count} meetings"
        }


# Singleton instance
_mock_zoom_service: Optional[MockZoomService] = None


def get_mock_zoom_service() -> MockZoomService:
    """Get singleton mock Zoom service instance"""
    global _mock_zoom_service
    if _mock_zoom_service is None:
        _mock_zoom_service = MockZoomService()
    return _mock_zoom_service


# Testing utilities
def demo_mock_zoom():
    """Demo script showing mock Zoom usage"""
    print("\n" + "="*60)
    print("Mock Zoom Service Demo")
    print("="*60 + "\n")
    
    zoom = get_mock_zoom_service()
    
    # Create meeting
    print("1. Creating meeting...")
    result = zoom.create_meeting(
        topic="Mock Team Standup",
        start_time=datetime.utcnow() + timedelta(hours=1),
        duration_minutes=30,
        created_by="manual"
    )
    meeting_id = result.get("zoom_meeting_id")
    print(f"   Meeting ID: {meeting_id}\n")
    
    # Get meeting
    print("2. Getting meeting details...")
    result = zoom.get_meeting(meeting_id)
    print(f"   Status: {result['meeting']['status']}\n")
    
    # Update meeting
    print("3. Updating meeting...")
    zoom.update_meeting(meeting_id, topic="Updated: Mock Team Standup", duration_minutes=45)
    print("   ✓ Updated\n")
    
    # List meetings
    print("4. Listing all meetings...")
    result = zoom.list_meetings()
    print(f"   Total meetings: {result['total_records']}\n")
    
    # Simulate meeting end
    print("5. Simulating meeting end...")
    zoom.simulate_meeting_end(meeting_id)
    print()
    
    # Get recordings
    print("6. Getting recordings...")
    result = zoom.get_meeting_recordings(meeting_id)
    print(f"   Recordings: {result.get('recording_count', 0)}\n")
    
    # Delete meeting
    print("7. Deleting meeting...")
    zoom.delete_meeting(meeting_id)
    print("   ✓ Deleted\n")
    
    print("="*60)
    print("Demo complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    demo_mock_zoom()
