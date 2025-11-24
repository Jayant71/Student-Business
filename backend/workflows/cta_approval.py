"""
CTA Approval Workflow
=====================

Handles automated workflows when a CTA submission is approved:
- Send welcome email
- Send WhatsApp welcome message
- Create user profile with temporary password
- Schedule optional welcome call
- Log all actions to CRM
- Notify admin

Usage:
------
from workflows.cta_approval import approve_cta_submission

result = approve_cta_submission(cta_id, approved_by_admin_id)
"""

import logging
import secrets
import string
from datetime import datetime
from typing import Dict, Optional
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_client import supabase
from services.email_service import get_email_service
from services.whatsapp_service import get_whatsapp_service
from services.voice_service import get_voice_service

logger = logging.getLogger(__name__)


class CTAApprovalWorkflow:
    """Manages CTA approval automated workflows"""
    
    def __init__(self):
        self.email_service = get_email_service()
        self.whatsapp_service = get_whatsapp_service()
        self.voice_service = get_voice_service()
    
    def approve_submission(self, cta_id: str, admin_id: str, schedule_call: bool = False) -> Dict:
        """
        Approve a CTA submission and trigger welcome workflow
        
        Args:
            cta_id: CTA submission ID
            admin_id: ID of admin approving
            schedule_call: Whether to schedule welcome call
        
        Returns:
            Dict with approval results
        """
        try:
            logger.info(f"[CTA Approval] Processing approval for CTA: {cta_id}")
            
            # Get CTA submission
            cta_response = supabase.table('cta_submissions') \
                .select('*') \
                .eq('id', cta_id) \
                .single() \
                .execute()
            
            if not cta_response.data:
                return {"success": False, "error": "CTA submission not found"}
            
            cta = cta_response.data
            
            # Check if already approved
            if cta.get('status') == 'approved':
                return {"success": False, "error": "CTA already approved"}
            
            # Update CTA status
            supabase.table('cta_submissions').update({
                'status': 'approved',
                'approved_at': datetime.utcnow().isoformat(),
                'approved_by': admin_id
            }).eq('id', cta_id).execute()
            
            # Create user profile
            profile_result = self._create_user_profile(cta)
            
            if not profile_result.get('success'):
                return {"success": False, "error": "Failed to create user profile"}
            
            user_id = profile_result['user_id']
            temp_password = profile_result['password']
            
            # Send welcome communications
            email_sent = self._send_welcome_email(cta, temp_password)
            whatsapp_sent = self._send_welcome_whatsapp(cta)
            
            # Schedule welcome call if requested
            call_scheduled = False
            if schedule_call and cta.get('phone'):
                call_scheduled = self._schedule_welcome_call(cta)
            
            # Log to CRM
            self._log_to_crm(cta, user_id)
            
            # Notify admin
            self._notify_admin(cta, admin_id)
            
            # Track conversion if from lead campaign
            self._track_lead_conversion(cta.get('email'), cta_id)
            
            logger.info(f"[CTA Approval] ✓ CTA {cta_id} approved successfully")
            
            return {
                "success": True,
                "user_id": user_id,
                "email_sent": email_sent,
                "whatsapp_sent": whatsapp_sent,
                "call_scheduled": call_scheduled
            }
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error approving CTA {cta_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _create_user_profile(self, cta: Dict) -> Dict:
        """Create user profile from CTA submission"""
        try:
            # Generate temporary password
            temp_password = self._generate_temp_password()
            
            # Create auth user
            auth_response = supabase.auth.admin.create_user({
                'email': cta['email'],
                'password': temp_password,
                'email_confirm': True,
                'user_metadata': {
                    'full_name': cta.get('name'),
                    'phone': cta.get('phone')
                }
            })
            
            user_id = auth_response.user.id
            
            # Create profile
            supabase.table('profiles').insert({
                'id': user_id,
                'full_name': cta.get('name'),
                'email': cta['email'],
                'phone': cta.get('phone'),
                'role': 'student',
                'cta_submission_id': cta['id'],
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            logger.info(f"[CTA Approval] ✓ Created user profile: {user_id}")
            
            return {
                "success": True,
                "user_id": user_id,
                "password": temp_password
            }
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error creating profile: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _send_welcome_email(self, cta: Dict, temp_password: str) -> bool:
        """Send welcome email with login credentials"""
        try:
            name = cta.get('name', 'Student')
            email = cta['email']
            
            result = self.email_service.send_email(
                to_email=email,
                subject="Welcome to Our Learning Platform! 🎉",
                content=self._format_welcome_email(name, email, temp_password)
            )
            
            return result.get('success', False)
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error sending welcome email: {str(e)}")
            return False
    
    def _send_welcome_whatsapp(self, cta: Dict) -> bool:
        """Send WhatsApp welcome message"""
        try:
            phone = cta.get('phone')
            if not phone:
                return False
            
            name = cta.get('name', 'Student')
            
            result = self.whatsapp_service.send_message(
                to_number=phone,
                template_name='welcome_student',
                params={
                    'student_name': name,
                    'course_name': 'Business Fundamentals',
                    'dashboard_link': 'http://your-app.com/student/dashboard'
                }
            )
            
            return result.get('success', False)
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error sending WhatsApp: {str(e)}")
            return False
    
    def _schedule_welcome_call(self, cta: Dict) -> bool:
        """Schedule welcome call"""
        try:
            phone = cta.get('phone')
            if not phone:
                return False
            
            name = cta.get('name', 'Student')
            
            result = self.voice_service.make_call(
                to_number=phone,
                script_id='welcome_call',
                agent_id='bot_welcome',
                metadata={
                    'student_name': name,
                    'cta_id': cta['id']
                }
            )
            
            return result.get('success', False)
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error scheduling call: {str(e)}")
            return False
    
    def _log_to_crm(self, cta: Dict, user_id: str):
        """Log approval to CRM"""
        try:
            supabase.table('crm_messages').insert({
                'student_id': user_id,
                'direction': 'outbound',
                'channel': 'system',
                'message': f"Welcome! Your application has been approved. Profile created successfully.",
                'status': 'delivered',
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            logger.info(f"[CTA Approval] ✓ Logged to CRM for user: {user_id}")
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error logging to CRM: {str(e)}")
    
    def _notify_admin(self, cta: Dict, admin_id: str):
        """Notify admin of successful approval"""
        try:
            # Create admin notification
            supabase.table('notifications').insert({
                'user_id': admin_id,
                'type': 'cta_approved',
                'title': 'CTA Approved Successfully',
                'message': f"{cta.get('name')} has been approved and user account created.",
                'read': False,
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            logger.info(f"[CTA Approval] ✓ Notified admin: {admin_id}")
            
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error notifying admin: {str(e)}")
    
    def _track_lead_conversion(self, email: str, cta_id: str):
        """Track if this CTA came from a lead campaign"""
        try:
            # Check if email exists in imported_leads
            response = supabase.table('imported_leads') \
                .select('*') \
                .eq('email', email) \
                .execute()
            
            if response.data:
                lead = response.data[0]
                
                # Update lead with conversion
                supabase.table('imported_leads').update({
                    'status': 'converted',
                    'cta_submission_id': cta_id,
                    'converted_at': datetime.utcnow().isoformat()
                }).eq('id', lead['id']).execute()
                
                logger.info(f"[CTA Approval] ✓ Tracked lead conversion: {email}")
                
        except Exception as e:
            logger.error(f"[CTA Approval] ✗ Error tracking conversion: {str(e)}")
    
    def _generate_temp_password(self, length: int = 12) -> str:
        """Generate secure temporary password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password
    
    def _format_welcome_email(self, name: str, email: str, password: str) -> str:
        """Format welcome email with credentials"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #3b82f6; margin-bottom: 10px;">Welcome Aboard! 🎉</h1>
                    <p style="color: #666;">Your application has been approved</p>
                </div>
                
                <p>Hi {name},</p>
                
                <p>Congratulations! We're thrilled to have you join our learning community. Your application has been approved, and your account is now active.</p>
                
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 5px;">
                    <h3 style="margin-top: 0; color: #3b82f6;">Your Login Credentials</h3>
                    <p style="margin: 10px 0;"><strong>Email:</strong> {email}</p>
                    <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: white; padding: 5px 10px; border-radius: 3px; font-size: 14px;">{password}</code></p>
                    <p style="color: #ef4444; font-size: 14px; margin-top: 15px;">⚠️ Please change your password after your first login for security.</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://your-app.com/signin" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login to Dashboard</a>
                </div>
                
                <h3 style="color: #10b981;">What's Next?</h3>
                <ul>
                    <li>✅ Complete your profile</li>
                    <li>📚 Browse available courses</li>
                    <li>📅 Check your session schedule</li>
                    <li>📝 Start with your first assignment</li>
                </ul>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 30px;">
                    <p style="margin: 0; font-size: 14px;"><strong>💡 Tip:</strong> Download our mobile app for on-the-go learning!</p>
                </div>
                
                <p style="margin-top: 30px;">Need help getting started? Our support team is here for you!</p>
                
                <p>Best regards,<br>The Learning Team</p>
                
                <p style="color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
                    This is an automated email. If you didn't apply to our platform, please contact us immediately.
                </p>
            </div>
        </body>
        </html>
        """


# Global instance
_cta_workflow: Optional[CTAApprovalWorkflow] = None


def get_cta_workflow() -> CTAApprovalWorkflow:
    """Get singleton CTA workflow instance"""
    global _cta_workflow
    if _cta_workflow is None:
        _cta_workflow = CTAApprovalWorkflow()
    return _cta_workflow


# Convenience function
def approve_cta_submission(cta_id: str, admin_id: str, schedule_call: bool = False) -> Dict:
    """Approve CTA submission (convenience function)"""
    return get_cta_workflow().approve_submission(cta_id, admin_id, schedule_call)


# CLI for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test CTA approval workflow')
    parser.add_argument('cta_id', help='CTA submission ID')
    parser.add_argument('admin_id', help='Admin user ID')
    parser.add_argument('--call', action='store_true', help='Schedule welcome call')
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"Approving CTA: {args.cta_id}")
    print(f"Admin: {args.admin_id}")
    print(f"Schedule Call: {args.call}")
    print(f"{'='*60}\n")
    
    workflow = get_cta_workflow()
    result = workflow.approve_submission(args.cta_id, args.admin_id, args.call)
    
    print(f"\nResult: {result}\n")
