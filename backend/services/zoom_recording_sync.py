"""
Zoom Recording Sync Background Job

Fetches cloud recordings from Zoom API and syncs them to database.
Should be run periodically (hourly recommended) via cron or scheduler.

Usage:
    python -m services.zoom_recording_sync
    
Or add to cron:
    0 * * * * cd /path/to/backend && python -m services.zoom_recording_sync
"""

from datetime import datetime, timedelta
from typing import List, Dict
import time
from services.zoom_service import get_zoom_service
from utils.supabase_client import supabase


class ZoomRecordingSync:
    """
    Background job to sync Zoom cloud recordings to database.
    
    Fetches recordings for sessions with Zoom meetings and updates
    the zoom_recordings table with download URLs and metadata.
    """
    
    def __init__(self):
        self.zoom_service = get_zoom_service()
        self.supabase = supabase
    
    def sync_recordings_for_session(self, session_id: str, zoom_meeting_id: str) -> Dict:
        """
        Sync recordings for a specific session.
        
        Args:
            session_id: Session UUID
            zoom_meeting_id: Zoom meeting ID
        
        Returns:
            dict: Sync result with recording count
        """
        try:
            # Fetch recordings from Zoom API
            result = self.zoom_service.get_meeting_recordings(zoom_meeting_id)
            
            if not result.get('success'):
                return {
                    'success': False,
                    'session_id': session_id,
                    'error': result.get('error', 'Failed to fetch recordings')
                }
            
            recordings = result.get('recordings', [])
            
            if not recordings:
                return {
                    'success': True,
                    'session_id': session_id,
                    'recordings_found': 0,
                    'message': 'No recordings available yet'
                }
            
            # Sync each recording to database
            synced_count = 0
            for recording in recordings:
                # Check if recording already exists
                existing = self.supabase.table('zoom_recordings').select('id').eq(
                    'recording_id', recording['id']
                ).execute()
                
                recording_data = {
                    'session_id': session_id,
                    'zoom_meeting_id': zoom_meeting_id,
                    'recording_id': recording['id'],
                    'recording_start': recording.get('recording_start'),
                    'recording_end': recording.get('recording_end'),
                    'file_type': recording.get('file_type'),
                    'file_size': recording.get('file_size'),
                    'download_url': recording.get('download_url'),
                    'play_url': recording.get('play_url'),
                    'recording_type': recording.get('recording_type'),
                    'status': 'available' if recording.get('status') == 'completed' else 'processing',
                    'synced_at': datetime.utcnow().isoformat(),
                    'metadata': {
                        'meeting_id': recording.get('meeting_id'),
                        'file_extension': recording.get('file_extension'),
                        'original_status': recording.get('status')
                    }
                }
                
                if existing.data:
                    # Update existing recording
                    self.supabase.table('zoom_recordings').update(recording_data).eq(
                        'recording_id', recording['id']
                    ).execute()
                else:
                    # Insert new recording
                    self.supabase.table('zoom_recordings').insert(recording_data).execute()
                
                synced_count += 1
            
            print(f"[Recording Sync] ✓ Session {session_id}: {synced_count} recording(s) synced")
            
            return {
                'success': True,
                'session_id': session_id,
                'recordings_found': len(recordings),
                'recordings_synced': synced_count
            }
            
        except Exception as e:
            error_msg = f"Failed to sync recordings for session {session_id}: {str(e)}"
            print(f"[Recording Sync] ✗ {error_msg}")
            return {
                'success': False,
                'session_id': session_id,
                'error': error_msg
            }
    
    def sync_all_recent_sessions(self, days_back: int = 7) -> Dict:
        """
        Sync recordings for all sessions from the past N days.
        
        Args:
            days_back: Number of days to look back for sessions
        
        Returns:
            dict: Sync results with counts
        """
        try:
            # Calculate date range
            start_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Find sessions with Zoom meetings scheduled in the past N days
            response = self.supabase.table('sessions').select(
                'id, zoom_meeting_id, title, scheduled_at'
            ).not_.is_(
                'zoom_meeting_id', 'null'
            ).gte(
                'scheduled_at', start_date.isoformat()
            ).execute()
            
            sessions = response.data if response.data else []
            
            print(f"[Recording Sync] Found {len(sessions)} sessions to check")
            
            results = {
                'total_sessions': len(sessions),
                'sessions_with_recordings': 0,
                'total_recordings_synced': 0,
                'failed': 0,
                'errors': []
            }
            
            for session in sessions:
                # Check if session has already happened
                scheduled_at = datetime.fromisoformat(session['scheduled_at'].replace('Z', '+00:00'))
                if scheduled_at > datetime.utcnow():
                    continue  # Session hasn't happened yet
                
                result = self.sync_recordings_for_session(
                    session_id=session['id'],
                    zoom_meeting_id=session['zoom_meeting_id']
                )
                
                if result.get('success'):
                    if result.get('recordings_found', 0) > 0:
                        results['sessions_with_recordings'] += 1
                        results['total_recordings_synced'] += result.get('recordings_synced', 0)
                else:
                    results['failed'] += 1
                    results['errors'].append({
                        'session_id': session['id'],
                        'title': session['title'],
                        'error': result.get('error')
                    })
                
                # Small delay to avoid rate limiting
                time.sleep(0.5)
            
            print(f"[Recording Sync] ✓ Sync complete:")
            print(f"  - Sessions checked: {results['total_sessions']}")
            print(f"  - Sessions with recordings: {results['sessions_with_recordings']}")
            print(f"  - Total recordings synced: {results['total_recordings_synced']}")
            print(f"  - Failed: {results['failed']}")
            
            return {
                'success': True,
                'results': results,
                'synced_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            error_msg = f"Recording sync job failed: {str(e)}"
            print(f"[Recording Sync] ✗ {error_msg}")
            return {
                'success': False,
                'error': error_msg
            }
    
    def sync_session_if_needed(self, session_id: str) -> Dict:
        """
        Sync recordings for a session only if not synced recently.
        
        Args:
            session_id: Session UUID
        
        Returns:
            dict: Sync result
        """
        try:
            # Get session details
            session_response = self.supabase.table('sessions').select(
                'id, zoom_meeting_id, scheduled_at'
            ).eq('id', session_id).single().execute()
            
            if not session_response.data or not session_response.data.get('zoom_meeting_id'):
                return {
                    'success': False,
                    'error': 'Session not found or has no Zoom meeting'
                }
            
            session = session_response.data
            zoom_meeting_id = session['zoom_meeting_id']
            
            # Check if session has happened
            scheduled_at = datetime.fromisoformat(session['scheduled_at'].replace('Z', '+00:00'))
            if scheduled_at > datetime.utcnow():
                return {
                    'success': False,
                    'error': 'Session has not occurred yet'
                }
            
            # Check last sync time
            recordings_response = self.supabase.table('zoom_recordings').select(
                'synced_at'
            ).eq('session_id', session_id).order('synced_at', desc=True).limit(1).execute()
            
            if recordings_response.data:
                last_sync = datetime.fromisoformat(
                    recordings_response.data[0]['synced_at'].replace('Z', '+00:00')
                )
                # Don't sync if synced within last 30 minutes
                if (datetime.utcnow() - last_sync).total_seconds() < 1800:
                    return {
                        'success': True,
                        'message': 'Already synced recently',
                        'last_sync': last_sync.isoformat()
                    }
            
            # Sync recordings
            return self.sync_recordings_for_session(session_id, zoom_meeting_id)
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Sync check failed: {str(e)}"
            }


def run_sync_job():
    """
    Main entry point for the recording sync job.
    Call this from cron or scheduler.
    """
    print(f"\n{'='*60}")
    print(f"Zoom Recording Sync Job")
    print(f"Started at: {datetime.utcnow().isoformat()}")
    print(f"{'='*60}\n")
    
    sync_service = ZoomRecordingSync()
    
    # Sync recordings for sessions from the past 7 days
    result = sync_service.sync_all_recent_sessions(days_back=7)
    
    print(f"\n{'='*60}")
    print(f"Job completed at: {datetime.utcnow().isoformat()}")
    
    if result.get('success'):
        print(f"Status: SUCCESS")
        results = result.get('results', {})
        print(f"Sessions checked: {results.get('total_sessions', 0)}")
        print(f"Recordings synced: {results.get('total_recordings_synced', 0)}")
    else:
        print(f"Status: FAILED")
        print(f"Error: {result.get('error')}")
    
    print(f"{'='*60}\n")
    
    return result


if __name__ == '__main__':
    run_sync_job()
