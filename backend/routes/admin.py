from flask import Blueprint, request, jsonify
from utils.supabase_client import supabase
from services.payment_service import PaymentService
from services.mock_payment_service import MockPaymentService
from services.certificate_service import get_certificate_service
from services.notification_service import get_notification_service
from services.support_ticket_service import get_support_ticket_service
from services.admin_verification_service import AdminVerificationService
from middleware.validator import validate_request, get_schema
from config import Config
from datetime import datetime, timezone

admin_bp = Blueprint('admin', __name__)

# Use mock payment service if in mock mode
if Config.MOCK_MODE:
    payment_service = MockPaymentService()
    print("[MOCK MODE] Using mock payment service")
else:
    payment_service = PaymentService()


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _lookup_user_id_by_email(email: str | None) -> str | None:
    if not email:
        return None
    try:
        response = supabase.table('profiles').select('id').eq('email', email).limit(1).execute()
        if response.data:
            return response.data[0].get('id')
    except Exception as err:
        print(f"[ADMIN] Failed to map email to profile: {err}")
    return None


def _map_payment_link(record: dict) -> dict:
    payload = record.get('webhook_payload') or {}
    nested_instamojo = payload.get('instamojo_response') or {}

    def _first_non_empty(*values):
        for value in values:
            if isinstance(value, str) and value.strip():
                return value
        return ''

    def _normalize_amount(value):
        if isinstance(value, (int, float)):
            return float(value)
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    status_raw = record.get('status') or nested_instamojo.get('status') or 'pending'
    status_label = str(status_raw).replace('_', ' ').title()

    return {
        'id': record.get('id') or record.get('payment_request_id'),
        'longurl': record.get('payment_url') or nested_instamojo.get('longurl') or payload.get('payment_url'),
        'amount': _normalize_amount(record.get('amount')),
        'purpose': _first_non_empty(record.get('purpose'), payload.get('purpose'), nested_instamojo.get('purpose')),
        'buyer_name': _first_non_empty(record.get('buyer_name'), payload.get('buyer_name'), nested_instamojo.get('buyer_name')),
        'email': _first_non_empty(record.get('email'), payload.get('email'), nested_instamojo.get('email')),
        'phone': _first_non_empty(record.get('phone'), payload.get('phone'), nested_instamojo.get('phone')),
        'status': status_label,
        'created_at': record.get('created_at') or nested_instamojo.get('created_at') or payload.get('created_at'),
        'payment_request_id': record.get('payment_request_id') or nested_instamojo.get('payment_request_id'),
        'metadata': payload,
    }


def _persist_payment_link(request_data: dict, service_response: dict) -> dict:
    user_id = _lookup_user_id_by_email(request_data.get('email'))
    payload = {
        'buyer_name': request_data.get('buyer_name'),
        'email': request_data.get('email'),
        'phone': request_data.get('phone'),
        'purpose': request_data.get('purpose'),
        'redirect_url': request_data.get('redirect_url'),
        'webhook': request_data.get('webhook'),
        'instamojo_response': service_response,
        'last_synced_at': _utc_iso(),
    }

    link_identifier = service_response.get('payment_link_id') or service_response.get('id')
    record_id = service_response.get('id')

    record = {
        'user_id': user_id,
        'payment_request_id': link_identifier,
        'payment_id': service_response.get('payment_id'),
        'amount': request_data.get('amount'),
        'status': 'pending',
        'payment_url': service_response.get('longurl') or service_response.get('shorturl'),
        'webhook_payload': payload,
    }

    if record_id:
        record['id'] = record_id

    if request_data.get('purpose'):
        record['purpose'] = request_data['purpose']
    if request_data.get('buyer_name'):
        record['buyer_name'] = request_data['buyer_name']
    if request_data.get('email'):
        record['email'] = request_data['email']
    if request_data.get('phone'):
        record['phone'] = request_data['phone']
    if link_identifier:
        record['payment_link_id'] = link_identifier

    response = supabase.table('payments').upsert(record, on_conflict='id').execute()
    if response.data:
        return response.data[0]
    raise ValueError('Failed to persist payment link to Supabase')

@admin_bp.route('/sync-leads', methods=['POST'])
def sync_leads():
    # Example: Trigger manual sync or processing of leads
    return jsonify({"status": "sync_started"}), 200

@admin_bp.route('/settings/mock-mode', methods=['GET'])
def get_mock_mode():
    """Get current mock mode setting"""
    try:
        return jsonify({
            "mock_mode": Config.MOCK_MODE,
            "environment": "development" if Config.MOCK_MODE else "production"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/settings/mock-mode', methods=['POST'])
def update_mock_mode():
    """Update mock mode setting (for demonstration - in production, this would be stored in database)"""
    try:
        data = request.json
        mock_mode = data.get('mock_mode', False)
        
        # In a real implementation, this would update a database table
        # For now, we'll just return the requested setting
        # Note: The actual Config.MOCK_MODE would need to be updated via environment variable restart
        
        print(f"[ADMIN] Mock mode setting requested: {mock_mode}")
        print(f"[ADMIN] Current mock mode: {Config.MOCK_MODE}")
        print(f"[ADMIN] To apply changes, restart the server with MOCK_MODE={'true' if mock_mode else 'false'}")
        
        return jsonify({
            "mock_mode": mock_mode,
            "message": "Setting updated. Restart server to apply changes.",
            "current_setting": Config.MOCK_MODE
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/payment-links', methods=['GET'])
def get_payment_links():
    try:
        limit = request.args.get('limit', 10, type=int)
        status = request.args.get('status')

        query = supabase.table('payments').select('*').order('created_at', desc=True)
        if limit:
            query = query.limit(limit)
        if status:
            query = query.eq('status', status.lower())

        response = query.execute()
        rows = response.data or []

        if not rows and Config.MOCK_MODE:
            links = payment_service.get_payment_links(limit, status)
            return jsonify(links), 200

        links = [_map_payment_link(row) for row in rows]
        return jsonify(links), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/payment-links', methods=['POST'])
def create_payment_link():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing payload"}), 400
        result = payment_service.create_payment_link(
            amount=data.get('amount'),
            purpose=data.get('purpose'),
            buyer_name=data.get('buyer_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            redirect_url=data.get('redirect_url')
        )
        
        if result:
            try:
                record = _persist_payment_link(data, result)
            except Exception as persist_error:
                print(f"[ADMIN] Failed to persist payment link: {persist_error}")
                return jsonify({"error": "Payment link created but failed to sync with Supabase"}), 500

            return jsonify(_map_payment_link(record)), 201
        return jsonify({"error": "Failed to create payment link"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/payment-links/<link_id>/resend', methods=['POST'])
def resend_payment_link(link_id):
    try:
        service_success = True
        if hasattr(payment_service, 'resend_payment_link'):
            service_success = payment_service.resend_payment_link(link_id)

        payload_response = supabase.table('payments').select('webhook_payload').eq('id', link_id).limit(1).execute()
        payload_data = (payload_response.data[0].get('webhook_payload') if payload_response.data else {}) or {}

        resend_count = payload_data.get('resend_count', 0)
        payload_data['last_resend_at'] = _utc_iso()
        payload_data['resend_count'] = resend_count + 1

        supabase.table('payments').update({'webhook_payload': payload_data}).eq('id', link_id).execute()

        if not service_success and not Config.MOCK_MODE:
            return jsonify({"error": "Failed to resend payment link"}), 500

        return jsonify({"status": "success", "sent": bool(service_success)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/payment-stats', methods=['GET'])
def get_payment_stats():
    try:
        if Config.MOCK_MODE:
            # Use mock service
            stats = payment_service.get_payment_stats()
            if stats:
                return jsonify(stats), 200
            else:
                return jsonify({"error": "Failed to get payment stats"}), 500
        else:
            # Mock stats - in real implementation, calculate from database
            stats = {
                "total_links": 45,
                "total_paid": 32,
                "total_pending": 13,
                "total_amount": 8910.00,
                "paid_amount": 6368.00,
                "pending_amount": 2542.00,
                "conversion_rate": 71.1
            }
            return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/payments', methods=['GET'])
def get_payments():
    try:
        # Mock payments data - in real implementation, fetch from database
        link_id = request.args.get('link_id')
        mock_payments = [
            {
                "id": "payment_1",
                "payment_request_id": "payment_1",
                "status": "Credit",
                "amount": 199.00,
                "fees": 9.95,
                "currency": "USD",
                "created_at": "2024-10-23T15:45:00Z",
                "buyer_name": "Student Name 2",
                "buyer_email": "student2@email.com",
                "buyer_phone": "+1234567892",
                "payment_id": "MOCK_PAYMENT_123"
            }
        ]
        return jsonify(mock_payments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Certificate Management Routes
# ============================================================================

@admin_bp.route('/certificates/generate', methods=['POST'])
def generate_certificate():
    """Generate a certificate for a student"""
    try:
        data = request.json
        student_id = data.get('student_id')
        course_name = data.get('course_name')
        completion_date = data.get('completion_date')
        grade = data.get('grade')
        admin_id = data.get('admin_id')
        
        if not student_id or not course_name:
            return jsonify({"error": "student_id and course_name are required"}), 400
        
        certificate_service = get_certificate_service(supabase)
        result = certificate_service.generate_certificate(
            student_id=student_id,
            course_name=course_name,
            completion_date=completion_date,
            grade=grade,
            admin_id=admin_id
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/certificates', methods=['GET'])
def get_all_certificates():
    """Get all certificates (admin view)"""
    try:
        response = supabase.table('certificates').select(
            'id, certificate_id, course_name, issued_at, grade, file_url, revoked, profiles(full_name, email)'
        ).order('issued_at', desc=True).execute()
        
        return jsonify(response.data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/certificates/<certificate_id>', methods=['GET'])
def get_certificate(certificate_id):
    """Get specific certificate details"""
    try:
        certificate_service = get_certificate_service(supabase)
        result = certificate_service.verify_certificate(certificate_id)
        
        if result.get('valid'):
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/certificates/<certificate_id>/revoke', methods=['POST'])
def revoke_certificate(certificate_id):
    """Revoke a certificate"""
    try:
        data = request.json
        admin_id = data.get('admin_id')
        reason = data.get('reason', 'No reason provided')
        
        if not admin_id:
            return jsonify({"error": "admin_id is required"}), 400
        
        certificate_service = get_certificate_service(supabase)
        result = certificate_service.revoke_certificate(
            certificate_id=certificate_id,
            admin_id=admin_id,
            reason=reason
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/students/<student_id>/certificates', methods=['GET'])
def get_student_certificates(student_id):
    """Get all certificates for a specific student"""
    try:
        certificate_service = get_certificate_service(supabase)
        certificates = certificate_service.get_student_certificates(student_id)
        
        return jsonify(certificates), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# CRM Tag Management Routes
# ============================================================================

@admin_bp.route('/crm/tags', methods=['GET'])
def get_crm_tags():
    """Get all CRM tags"""
    try:
        response = supabase.table('contact_tags').select('*').order('name').execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/tags', methods=['POST'])
def create_crm_tag():
    """Create a new CRM tag"""
    try:
        data = request.json
        name = data.get('name')
        color = data.get('color', 'gray')
        description = data.get('description')
        
        if not name:
            return jsonify({"error": "name is required"}), 400
        
        response = supabase.table('contact_tags').insert({
            'name': name,
            'color': color,
            'description': description
        }).execute()
        
        return jsonify(response.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/contacts/<contact_id>/tags', methods=['POST'])
def assign_tag_to_contact(contact_id):
    """Assign a tag to a contact"""
    try:
        data = request.json
        tag_id = data.get('tag_id')
        admin_id = data.get('admin_id')
        
        if not tag_id:
            return jsonify({"error": "tag_id is required"}), 400
        
        response = supabase.table('contact_tag_assignments').insert({
            'contact_id': contact_id,
            'tag_id': tag_id,
            'assigned_by': admin_id
        }).execute()
        
        return jsonify(response.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/contacts/<contact_id>/tags/<tag_id>', methods=['DELETE'])
def remove_tag_from_contact(contact_id, tag_id):
    """Remove a tag from a contact"""
    try:
        supabase.table('contact_tag_assignments').delete().eq(
            'contact_id', contact_id
        ).eq('tag_id', tag_id).execute()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/contacts/with-tags', methods=['GET'])
def get_contacts_with_tags():
    """Get all contacts with their tags"""
    try:
        # Call the database function
        response = supabase.rpc('get_contacts_with_tags').execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/messages/search', methods=['GET'])
def search_crm_messages():
    """Search CRM messages with filters"""
    try:
        search_text = request.args.get('search')
        contact_id = request.args.get('contact_id')
        channel = request.args.get('channel')
        important_only = request.args.get('important') == 'true'
        archived = request.args.get('archived') == 'true'
        
        response = supabase.rpc('search_crm_messages', {
            'search_text': search_text,
            'contact_filter': contact_id,
            'channel_filter': channel,
            'important_only': important_only,
            'archived_filter': archived
        }).execute()
        
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/messages/<message_id>/important', methods=['PATCH'])
def toggle_message_important(message_id):
    """Toggle important flag on a message"""
    try:
        data = request.json
        is_important = data.get('is_important', False)
        
        response = supabase.table('crm_messages').update({
            'is_important': is_important
        }).eq('id', message_id).execute()
        
        return jsonify(response.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/crm/messages/<message_id>/archive', methods=['PATCH'])
def toggle_message_archive(message_id):
    """Toggle archive flag on a message"""
    try:
        data = request.json
        is_archived = data.get('is_archived', False)
        
        response = supabase.table('crm_messages').update({
            'is_archived': is_archived
        }).eq('id', message_id).execute()
        
        return jsonify(response.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Notification Routes
# ============================================================================

@admin_bp.route('/notifications', methods=['GET'])
def get_notifications():
    """Get notifications for the current user"""
    try:
        user_id = request.args.get('user_id')
        unread_only = request.args.get('unread_only') == 'true'
        limit = int(request.args.get('limit', 50))
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        notification_service = get_notification_service(supabase)
        notifications = notification_service.get_user_notifications(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit
        )
        
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/notifications/unread-count', methods=['GET'])
def get_unread_count():
    """Get count of unread notifications"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        notification_service = get_notification_service(supabase)
        count = notification_service.get_unread_count(user_id)
        
        return jsonify({"count": count}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/notifications/<notification_id>/read', methods=['PATCH'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notification_service = get_notification_service(supabase)
        result = notification_service.mark_as_read(notification_id)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    """Mark all notifications as read for a user"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        notification_service = get_notification_service(supabase)
        result = notification_service.mark_all_as_read(user_id)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/notifications/<notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        notification_service = get_notification_service(supabase)
        result = notification_service.delete_notification(notification_id)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# Support Ticket Routes
# ============================================================================

@admin_bp.route('/support/tickets', methods=['GET'])
def get_support_tickets():
    """Get all support tickets with optional filters"""
    try:
        status = request.args.get('status')
        priority = request.args.get('priority')
        assigned_to = request.args.get('assigned_to')
        
        ticket_service = get_support_ticket_service(supabase)
        tickets = ticket_service.get_all_tickets(
            status_filter=status,
            priority_filter=priority,
            assigned_to=assigned_to
        )
        
        return jsonify(tickets), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/tickets', methods=['POST'])
def create_support_ticket():
    """Create a new support ticket"""
    try:
        data = request.json
        student_id = data.get('student_id')
        subject = data.get('subject')
        description = data.get('description')
        category = data.get('category')
        priority = data.get('priority', 'medium')
        
        if not student_id or not subject or not description:
            return jsonify({"error": "student_id, subject, and description are required"}), 400
        
        ticket_service = get_support_ticket_service(supabase)
        result = ticket_service.create_ticket(
            student_id=student_id,
            subject=subject,
            description=description,
            category=category,
            priority=priority
        )
        
        if result['success']:
            return jsonify(result['ticket']), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/tickets/<ticket_id>', methods=['GET'])
def get_support_ticket(ticket_id):
    """Get specific ticket with replies"""
    try:
        ticket_service = get_support_ticket_service(supabase)
        result = ticket_service.get_ticket_with_replies(ticket_id)
        
        if result['success']:
            return jsonify(result['ticket']), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/tickets/<ticket_id>/status', methods=['PATCH'])
def update_ticket_status(ticket_id):
    """Update ticket status"""
    try:
        data = request.json
        status = data.get('status')
        admin_id = data.get('admin_id')
        
        if not status:
            return jsonify({"error": "status is required"}), 400
        
        ticket_service = get_support_ticket_service(supabase)
        result = ticket_service.update_ticket_status(
            ticket_id=ticket_id,
            status=status,
            admin_id=admin_id
        )
        
        if result['success']:
            return jsonify(result['ticket']), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/tickets/<ticket_id>/assign', methods=['PATCH'])
def assign_support_ticket(ticket_id):
    """Assign ticket to an admin"""
    try:
        data = request.json
        admin_id = data.get('admin_id')
        
        if not admin_id:
            return jsonify({"error": "admin_id is required"}), 400
        
        ticket_service = get_support_ticket_service(supabase)
        result = ticket_service.assign_ticket(
            ticket_id=ticket_id,
            admin_id=admin_id
        )
        
        if result['success']:
            return jsonify(result['ticket']), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/tickets/<ticket_id>/replies', methods=['POST'])
def add_ticket_reply(ticket_id):
    """Add a reply to a support ticket"""
    try:
        data = request.json
        author_id = data.get('author_id')
        message = data.get('message')
        is_internal_note = data.get('is_internal_note', False)
        
        if not author_id or not message:
            return jsonify({"error": "author_id and message are required"}), 400
        
        ticket_service = get_support_ticket_service(supabase)
        result = ticket_service.add_reply(
            ticket_id=ticket_id,
            author_id=author_id,
            message=message,
            is_internal_note=is_internal_note
        )
        
        if result['success']:
            return jsonify(result['reply']), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/students/<student_id>/tickets', methods=['GET'])
def get_student_support_tickets(student_id):
    """Get all tickets for a specific student"""
    try:
        ticket_service = get_support_ticket_service(supabase)
        tickets = ticket_service.get_student_tickets(student_id)
        
        return jsonify(tickets), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/support/stats', methods=['GET'])
def get_support_stats():
    """Get support ticket statistics"""
    try:
        response = supabase.rpc('get_ticket_stats').execute()
        return jsonify(response.data[0] if response.data else {}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# ADMIN VERIFICATION ROUTES
# =============================================================================

@admin_bp.route('/verification/request', methods=['POST'])
@validate_request(get_schema('admin_request'))
def request_admin_access():
    """Submit a request for admin access (public endpoint)"""
    try:
        data = request.validated_data
        
        result = AdminVerificationService.request_admin_access(
            email=data['email'],
            full_name=data['full_name'],
            phone=data.get('phone'),
            reason=data['reason']
        )
        
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/verification/requests', methods=['GET'])
def get_admin_requests():
    """Get all admin requests (optionally filtered by status)"""
    try:
        status = request.args.get('status')
        requests = AdminVerificationService.get_all_requests(status)
        
        return jsonify(requests), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/verification/requests/pending', methods=['GET'])
def get_pending_admin_requests():
    """Get all pending admin requests"""
    try:
        requests = AdminVerificationService.get_pending_requests()
        return jsonify(requests), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/verification/requests/<request_id>/approve', methods=['POST'])
@validate_request({
    'reviewer_id': {'required': True, 'type': 'uuid'},
    'notes': {'required': False, 'type': 'str', 'max_length': 500}
})
def approve_admin_request(request_id):
    """Approve an admin access request"""
    try:
        data = request.validated_data
        
        result = AdminVerificationService.approve_request(
            request_id=request_id,
            reviewer_id=data['reviewer_id'],
            notes=data.get('notes')
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/verification/requests/<request_id>/reject', methods=['POST'])
@validate_request({
    'reviewer_id': {'required': True, 'type': 'uuid'},
    'reason': {'required': True, 'type': 'str', 'min_length': 10, 'max_length': 500}
})
def reject_admin_request(request_id):
    """Reject an admin access request"""
    try:
        data = request.validated_data
        
        result = AdminVerificationService.reject_request(
            request_id=request_id,
            reviewer_id=data['reviewer_id'],
            reason=data['reason']
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/verification/verify-token', methods=['POST'])
@validate_request({
    'token': {'required': True, 'type': 'str', 'min_length': 32, 'max_length': 64}
})
def verify_admin_token():
    """Verify an admin verification token"""
    try:
        data = request.validated_data
        result = AdminVerificationService.verify_token(data['token'])
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e), "valid": False}), 400
    except Exception as e:
        return jsonify({"error": str(e), "valid": False}), 500


@admin_bp.route('/verification/complete-setup', methods=['POST'])
@validate_request({
    'token': {'required': True, 'type': 'str', 'min_length': 32, 'max_length': 64},
    'user_id': {'required': True, 'type': 'uuid'}
})
def complete_admin_setup():
    """Complete admin account setup after auth signup"""
    try:
        data = request.validated_data
        
        result = AdminVerificationService.complete_admin_setup(
            token=data['token'],
            user_id=data['user_id']
        )
        
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


