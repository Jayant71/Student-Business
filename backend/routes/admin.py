from flask import Blueprint, request, jsonify
from utils.supabase_client import supabase
from services.payment_service import PaymentService
from services.mock_payment_service import MockPaymentService
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
