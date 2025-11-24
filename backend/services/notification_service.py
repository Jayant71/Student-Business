"""
Notification Service

Handles creation, delivery, and management of in-app notifications.
Supports multiple notification types and real-time delivery via Supabase.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from supabase import Client


class NotificationService:
    """Service for managing in-app notifications"""
    
    NOTIFICATION_TYPES = {
        'payment': {
            'title_template': 'Payment Received',
            'icon': '💰',
            'color': 'green'
        },
        'cta': {
            'title_template': 'New CTA Submission',
            'icon': '📝',
            'color': 'blue'
        },
        'assignment': {
            'title_template': 'Assignment Submitted',
            'icon': '📚',
            'color': 'purple'
        },
        'message': {
            'title_template': 'New Message',
            'icon': '💬',
            'color': 'blue'
        },
        'session': {
            'title_template': 'Session Update',
            'icon': '🎓',
            'color': 'indigo'
        },
        'recording': {
            'title_template': 'Recording Available',
            'icon': '🎥',
            'color': 'red'
        },
        'certificate': {
            'title_template': 'Certificate Issued',
            'icon': '🏆',
            'color': 'yellow'
        },
        'system': {
            'title_template': 'System Notification',
            'icon': 'ℹ️',
            'color': 'gray'
        }
    }
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    def create_notification(
        self,
        user_id: str,
        notification_type: str,
        message: str,
        title: Optional[str] = None,
        link: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new notification for a user
        
        Args:
            user_id: UUID of the user to notify
            notification_type: Type of notification (payment, cta, assignment, message, session)
            message: Notification message content
            title: Custom title (optional, uses type default if not provided)
            link: URL to navigate to when notification is clicked
            metadata: Additional metadata for the notification
            
        Returns:
            Dict with success status and notification data
        """
        try:
            # Get notification type config
            type_config = self.NOTIFICATION_TYPES.get(notification_type, self.NOTIFICATION_TYPES['system'])
            
            # Use custom title or default
            notification_title = title or type_config['title_template']
            
            # Create notification
            notification_data = {
                'user_id': user_id,
                'type': notification_type,
                'title': notification_title,
                'message': message,
                'link': link,
                'read': False,
                'metadata': metadata or {}
            }
            
            response = self.supabase.table('notifications').insert(notification_data).execute()
            
            if response.data:
                print(f"[Notification Service] Created {notification_type} notification for user {user_id}")
                return {
                    'success': True,
                    'notification': response.data[0]
                }
            else:
                return {'success': False, 'error': 'Failed to create notification'}
                
        except Exception as e:
            print(f"[Notification Service] Error creating notification: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def create_bulk_notifications(
        self,
        user_ids: List[str],
        notification_type: str,
        message: str,
        title: Optional[str] = None,
        link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create notifications for multiple users at once
        
        Args:
            user_ids: List of user UUIDs
            notification_type: Type of notification
            message: Notification message
            title: Custom title (optional)
            link: URL link (optional)
            
        Returns:
            Dict with success status and count
        """
        try:
            type_config = self.NOTIFICATION_TYPES.get(notification_type, self.NOTIFICATION_TYPES['system'])
            notification_title = title or type_config['title_template']
            
            # Build notification data for all users
            notifications_data = [
                {
                    'user_id': user_id,
                    'type': notification_type,
                    'title': notification_title,
                    'message': message,
                    'link': link,
                    'read': False
                }
                for user_id in user_ids
            ]
            
            response = self.supabase.table('notifications').insert(notifications_data).execute()
            
            if response.data:
                count = len(response.data)
                print(f"[Notification Service] Created {count} notifications")
                return {
                    'success': True,
                    'count': count,
                    'notifications': response.data
                }
            else:
                return {'success': False, 'error': 'Failed to create notifications'}
                
        except Exception as e:
            print(f"[Notification Service] Error creating bulk notifications: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def notify_payment_received(
        self,
        user_id: str,
        amount: float,
        payment_id: str
    ) -> Dict[str, Any]:
        """Notify user about payment received"""
        message = f"Payment of ₹{amount:.2f} has been received successfully."
        return self.create_notification(
            user_id=user_id,
            notification_type='payment',
            message=message,
            link=f"/payments/{payment_id}",
            metadata={'amount': amount, 'payment_id': payment_id}
        )
    
    def notify_cta_submission(
        self,
        admin_ids: List[str],
        student_name: str,
        cta_id: str
    ) -> Dict[str, Any]:
        """Notify admins about new CTA submission"""
        message = f"{student_name} has submitted a new Call-to-Action form."
        return self.create_bulk_notifications(
            user_ids=admin_ids,
            notification_type='cta',
            message=message,
            link=f"/admin/cta-review?id={cta_id}"
        )
    
    def notify_assignment_submitted(
        self,
        admin_ids: List[str],
        student_name: str,
        assignment_title: str,
        assignment_id: str
    ) -> Dict[str, Any]:
        """Notify admins about assignment submission"""
        message = f"{student_name} submitted: {assignment_title}"
        return self.create_bulk_notifications(
            user_ids=admin_ids,
            notification_type='assignment',
            message=message,
            link=f"/admin/assignments?id={assignment_id}"
        )
    
    def notify_new_message(
        self,
        user_id: str,
        sender_name: str,
        channel: str
    ) -> Dict[str, Any]:
        """Notify about new CRM message"""
        message = f"New message from {sender_name} via {channel}"
        return self.create_notification(
            user_id=user_id,
            notification_type='message',
            message=message,
            link="/admin/crm"
        )
    
    def notify_session_reminder(
        self,
        user_id: str,
        session_title: str,
        time_until: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Notify about upcoming session"""
        message = f"Your session '{session_title}' starts {time_until}"
        return self.create_notification(
            user_id=user_id,
            notification_type='session',
            message=message,
            link=f"/sessions/{session_id}"
        )
    
    def notify_recording_available(
        self,
        user_id: str,
        session_title: str,
        recording_id: str
    ) -> Dict[str, Any]:
        """Notify about recording availability"""
        message = f"Recording available for: {session_title}"
        return self.create_notification(
            user_id=user_id,
            notification_type='recording',
            message=message,
            link=f"/recordings/{recording_id}"
        )
    
    def notify_certificate_issued(
        self,
        user_id: str,
        course_name: str,
        certificate_id: str
    ) -> Dict[str, Any]:
        """Notify about certificate issuance"""
        message = f"🎉 Congratulations! Your certificate for {course_name} is ready."
        return self.create_notification(
            user_id=user_id,
            notification_type='certificate',
            message=message,
            link=f"/certificates/{certificate_id}"
        )
    
    def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get notifications for a user
        
        Args:
            user_id: User UUID
            unread_only: If True, only return unread notifications
            limit: Maximum number of notifications to return
            
        Returns:
            List of notification dicts
        """
        try:
            query = self.supabase.table('notifications').select('*').eq('user_id', user_id)
            
            if unread_only:
                query = query.eq('read', False)
            
            response = query.order('created_at', desc=True).limit(limit).execute()
            
            return response.data or []
            
        except Exception as e:
            print(f"[Notification Service] Error fetching notifications: {str(e)}")
            return []
    
    def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for a user"""
        try:
            # Use the helper function from migration
            response = self.supabase.rpc('get_unread_notification_count', {
                'user_uuid': user_id
            }).execute()
            
            return response.data if response.data is not None else 0
            
        except Exception as e:
            print(f"[Notification Service] Error getting unread count: {str(e)}")
            return 0
    
    def mark_as_read(self, notification_id: str) -> Dict[str, Any]:
        """Mark a notification as read"""
        try:
            response = self.supabase.table('notifications').update({
                'read': True
            }).eq('id', notification_id).execute()
            
            if response.data:
                return {'success': True}
            return {'success': False, 'error': 'Notification not found'}
            
        except Exception as e:
            print(f"[Notification Service] Error marking as read: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def mark_all_as_read(self, user_id: str) -> Dict[str, Any]:
        """Mark all notifications as read for a user"""
        try:
            # Use the helper function from migration
            response = self.supabase.rpc('mark_all_notifications_read', {
                'user_uuid': user_id
            }).execute()
            
            return {'success': True}
            
        except Exception as e:
            print(f"[Notification Service] Error marking all as read: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def delete_notification(self, notification_id: str) -> Dict[str, Any]:
        """Delete a notification"""
        try:
            self.supabase.table('notifications').delete().eq('id', notification_id).execute()
            return {'success': True}
            
        except Exception as e:
            print(f"[Notification Service] Error deleting notification: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def delete_old_notifications(self, days: int = 30) -> Dict[str, Any]:
        """Delete notifications older than specified days"""
        try:
            cutoff_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            cutoff_date = cutoff_date.isoformat()
            
            # Delete read notifications older than cutoff
            self.supabase.table('notifications').delete().eq('read', True).lt(
                'created_at', cutoff_date
            ).execute()
            
            return {'success': True}
            
        except Exception as e:
            print(f"[Notification Service] Error deleting old notifications: {str(e)}")
            return {'success': False, 'error': str(e)}


# Singleton instance
_notification_service_instance = None

def get_notification_service(supabase_client: Client = None) -> NotificationService:
    """Get or create notification service instance"""
    global _notification_service_instance
    if _notification_service_instance is None:
        if supabase_client is None:
            from utils.supabase_client import get_supabase_client
            supabase_client = get_supabase_client()
        _notification_service_instance = NotificationService(supabase_client)
    return _notification_service_instance


# CLI for testing
if __name__ == "__main__":
    import sys
    from utils.supabase_client import get_supabase_client
    
    if len(sys.argv) < 3:
        print("Usage: python notification_service.py <user_id> <type> <message>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    notif_type = sys.argv[2]
    message = sys.argv[3]
    
    supabase = get_supabase_client()
    service = NotificationService(supabase)
    
    print(f"Creating {notif_type} notification for user {user_id}...")
    result = service.create_notification(
        user_id=user_id,
        notification_type=notif_type,
        message=message
    )
    
    if result['success']:
        print(f"✓ Notification created successfully!")
        print(f"  ID: {result['notification']['id']}")
    else:
        print(f"✗ Error: {result['error']}")
