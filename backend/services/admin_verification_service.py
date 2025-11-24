"""
Admin Verification Service

Handles admin registration requests, approval workflow, and account creation.
Includes email verification and security checks.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import secrets
from utils.supabase_client import supabase
from services.email_service import get_email_service


class AdminVerificationService:
    """Service for handling admin registration and verification"""
    
    @staticmethod
    def request_admin_access(
        email: str,
        full_name: str,
        phone: Optional[str],
        reason: str
    ) -> Dict[str, Any]:
        """
        Submit a request for admin access
        
        Args:
            email: Requester's email
            full_name: Requester's full name
            phone: Optional phone number
            reason: Reason for requesting admin access
        
        Returns:
            Dict with request details
        """
        try:
            # Check if email already exists in profiles
            existing_user = supabase.table('profiles').select('id, role').eq('email', email).execute()
            
            if existing_user.data:
                user = existing_user.data[0]
                if user['role'] == 'admin':
                    raise ValueError("User is already an admin")
                elif user['role'] == 'student':
                    raise ValueError("Email is registered as a student. Please use a different email.")
            
            # Check for existing pending request
            pending = supabase.table('admin_requests')\
                .select('*')\
                .eq('email', email)\
                .eq('status', 'pending')\
                .execute()
            
            if pending.data:
                raise ValueError("You already have a pending admin request")
            
            # Create admin request
            request_data = {
                'email': email,
                'full_name': full_name,
                'phone': phone,
                'reason': reason,
                'status': 'pending',
                'requested_at': datetime.now().isoformat()
            }
            
            result = supabase.table('admin_requests').insert(request_data).execute()
            
            if not result.data:
                raise Exception("Failed to create admin request")
            
            request_record = result.data[0]
            
            # Notify super admins about new request
            AdminVerificationService._notify_super_admins_new_request(request_record)
            
            # Send confirmation email to requester
            email_service = get_email_service()
            email_service.send_email(
                to_email=email,
                subject="Admin Access Request Received",
                content=f"""
                <html>
                <body>
                    <h2>Admin Access Request Received</h2>
                    <p>Dear {full_name},</p>
                    <p>We have received your request for admin access to the Student Business platform.</p>
                    <p><strong>Request Details:</strong></p>
                    <ul>
                        <li>Email: {email}</li>
                        <li>Name: {full_name}</li>
                        <li>Submitted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                    </ul>
                    <p>Your request will be reviewed by our team. You will receive an email once a decision is made.</p>
                    <p>Thank you for your interest!</p>
                </body>
                </html>
                """
            )
            
            return {
                'success': True,
                'request_id': request_record['id'],
                'message': 'Admin access request submitted successfully'
            }
            
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Failed to submit admin request: {str(e)}")
    
    @staticmethod
    def get_pending_requests() -> List[Dict[str, Any]]:
        """Get all pending admin requests"""
        try:
            result = supabase.table('admin_requests')\
                .select('*')\
                .eq('status', 'pending')\
                .order('requested_at', desc=True)\
                .execute()
            
            return result.data if result.data else []
        except Exception as e:
            raise Exception(f"Failed to fetch pending requests: {str(e)}")
    
    @staticmethod
    def get_all_requests(status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all admin requests, optionally filtered by status"""
        try:
            query = supabase.table('admin_requests').select('*')
            
            if status:
                query = query.eq('status', status)
            
            result = query.order('requested_at', desc=True).execute()
            
            return result.data if result.data else []
        except Exception as e:
            raise Exception(f"Failed to fetch admin requests: {str(e)}")
    
    @staticmethod
    def approve_request(
        request_id: str,
        reviewer_id: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Approve an admin access request and create admin account
        
        Args:
            request_id: ID of the admin request
            reviewer_id: ID of the admin reviewing the request
            notes: Optional notes about the approval
        
        Returns:
            Dict with approval details and verification token
        """
        try:
            # Get request details
            request_result = supabase.table('admin_requests')\
                .select('*')\
                .eq('id', request_id)\
                .single()\
                .execute()
            
            if not request_result.data:
                raise ValueError("Admin request not found")
            
            request = request_result.data
            
            if request['status'] != 'pending':
                raise ValueError(f"Request is already {request['status']}")
            
            # Generate verification token
            verification_token = secrets.token_urlsafe(32)
            
            # Update request status
            update_data = {
                'status': 'approved',
                'reviewed_by': reviewer_id,
                'reviewed_at': datetime.now().isoformat(),
                'reviewer_notes': notes,
                'verification_token': verification_token
            }
            
            supabase.table('admin_requests')\
                .update(update_data)\
                .eq('id', request_id)\
                .execute()
            
            # Send approval email with verification link
            verification_link = f"{AdminVerificationService._get_base_url()}/admin/verify?token={verification_token}"
            
            email_service = get_email_service()
            email_service.send_email(
                to_email=request['email'],
                subject="Admin Access Request Approved",
                content=f"""
                <html>
                <body>
                    <h2>Admin Access Request Approved!</h2>
                    <p>Dear {request['full_name']},</p>
                    <p>Great news! Your request for admin access has been approved.</p>
                    <p>To complete your admin account setup, please click the link below to verify your email and set your password:</p>
                    <p>
                        <a href="{verification_link}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
                            Verify Email & Set Password
                        </a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p>{verification_link}</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>Welcome to the team!</p>
                </body>
                </html>
                """
            )
            
            return {
                'success': True,
                'message': 'Admin request approved and verification email sent',
                'verification_token': verification_token
            }
            
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Failed to approve request: {str(e)}")
    
    @staticmethod
    def reject_request(
        request_id: str,
        reviewer_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reject an admin access request
        
        Args:
            request_id: ID of the admin request
            reviewer_id: ID of the admin reviewing the request
            reason: Reason for rejection
        
        Returns:
            Dict with rejection confirmation
        """
        try:
            # Get request details
            request_result = supabase.table('admin_requests')\
                .select('*')\
                .eq('id', request_id)\
                .single()\
                .execute()
            
            if not request_result.data:
                raise ValueError("Admin request not found")
            
            request = request_result.data
            
            if request['status'] != 'pending':
                raise ValueError(f"Request is already {request['status']}")
            
            # Update request status
            update_data = {
                'status': 'rejected',
                'reviewed_by': reviewer_id,
                'reviewed_at': datetime.now().isoformat(),
                'reviewer_notes': reason
            }
            
            supabase.table('admin_requests')\
                .update(update_data)\
                .eq('id', request_id)\
                .execute()
            
            # Send rejection email
            email_service = get_email_service()
            email_service.send_email(
                to_email=request['email'],
                subject="Admin Access Request Update",
                content=f"""
                <html>
                <body>
                    <h2>Admin Access Request Update</h2>
                    <p>Dear {request['full_name']},</p>
                    <p>Thank you for your interest in joining our admin team.</p>
                    <p>After careful review, we are unable to approve your admin access request at this time.</p>
                    <p><strong>Reason:</strong></p>
                    <p>{reason}</p>
                    <p>If you have questions or would like to discuss this decision, please contact us.</p>
                    <p>Thank you for your understanding.</p>
                </body>
                </html>
                """
            )
            
            return {
                'success': True,
                'message': 'Admin request rejected and notification email sent'
            }
            
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Failed to reject request: {str(e)}")
    
    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """
        Verify a token and get associated request details
        
        Args:
            token: Verification token
        
        Returns:
            Dict with request details if valid
        """
        try:
            result = supabase.table('admin_requests')\
                .select('*')\
                .eq('verification_token', token)\
                .eq('status', 'approved')\
                .single()\
                .execute()
            
            if not result.data:
                raise ValueError("Invalid or expired verification token")
            
            request = result.data
            
            # Check if token is expired (24 hours)
            reviewed_at = datetime.fromisoformat(request['reviewed_at'])
            if (datetime.now() - reviewed_at).total_seconds() > 86400:
                raise ValueError("Verification token has expired")
            
            # Check if already used
            if request.get('admin_user_id'):
                raise ValueError("This verification token has already been used")
            
            return {
                'valid': True,
                'request': request
            }
            
        except ValueError as e:
            raise e
        except Exception as e:
            raise Exception(f"Token verification failed: {str(e)}")
    
    @staticmethod
    def complete_admin_setup(
        token: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Complete admin account setup after Supabase Auth signup
        
        Args:
            token: Verification token
            user_id: Supabase Auth user ID
        
        Returns:
            Dict with completion status
        """
        try:
            # Verify token
            verification = AdminVerificationService.verify_token(token)
            request = verification['request']
            
            # Update admin request with user ID
            supabase.table('admin_requests')\
                .update({'admin_user_id': user_id})\
                .eq('id', request['id'])\
                .execute()
            
            # Update profile role to admin
            supabase.table('profiles')\
                .update({'role': 'admin'})\
                .eq('id', user_id)\
                .execute()
            
            # Log audit event
            supabase.rpc('log_admin_action', {
                'p_admin_id': user_id,
                'p_action': 'admin_account_created',
                'p_resource_type': 'admin_user',
                'p_resource_id': user_id,
                'p_details': {
                    'email': request['email'],
                    'full_name': request['full_name'],
                    'request_id': request['id']
                }
            }).execute()
            
            return {
                'success': True,
                'message': 'Admin account setup completed successfully'
            }
            
        except Exception as e:
            raise Exception(f"Failed to complete admin setup: {str(e)}")
    
    @staticmethod
    def _notify_super_admins_new_request(request: Dict[str, Any]):
        """Notify super admins about new admin request"""
        try:
            # Get all super admins
            admins = supabase.table('profiles')\
                .select('email, full_name')\
                .eq('role', 'admin')\
                .execute()
            
            if not admins.data:
                return
            
            # Send notification email to each admin
            email_service = get_email_service()
            for admin in admins.data:
                email_service.send_email(
                    to_email=admin['email'],
                    subject="New Admin Access Request",
                    content=f"""
                    <html>
                    <body>
                        <h2>New Admin Access Request</h2>
                        <p>Dear {admin['full_name']},</p>
                        <p>A new admin access request has been submitted and requires review:</p>
                        <p><strong>Request Details:</strong></p>
                        <ul>
                            <li>Name: {request['full_name']}</li>
                            <li>Email: {request['email']}</li>
                            <li>Phone: {request.get('phone', 'Not provided')}</li>
                            <li>Submitted: {datetime.fromisoformat(request['requested_at']).strftime('%Y-%m-%d %H:%M:%S')}</li>
                        </ul>
                        <p><strong>Reason:</strong></p>
                        <p>{request['reason']}</p>
                        <p>Please log in to the admin panel to review and process this request.</p>
                    </body>
                    </html>
                    """
                )
        except Exception as e:
            # Don't fail the request if notifications fail
            print(f"Failed to notify admins: {str(e)}")
    
    @staticmethod
    def _get_base_url() -> str:
        """Get base URL for verification links"""
        import os
        return os.getenv('APP_BASE_URL', 'http://localhost:5173')
