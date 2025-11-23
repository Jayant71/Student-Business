from flask import Blueprint, request, jsonify
from services.email_service import EmailService
from services.whatsapp_service import WhatsAppService
from services.voice_service import VoiceService
from services.mock_email_service import MockEmailService
from services.mock_whatsapp_service import MockWhatsAppService
from services.mock_voice_service import MockVoiceService
from config import Config

automation_bp = Blueprint('automation', __name__)

# Use mock services if in mock mode
if Config.MOCK_MODE:
    email_service = MockEmailService()
    whatsapp_service = MockWhatsAppService()
    voice_service = MockVoiceService()
    print("[MOCK MODE] Using mock services for automation")
else:
    email_service = EmailService()
    whatsapp_service = WhatsAppService()
    voice_service = VoiceService()

@automation_bp.route('/trigger/email', methods=['POST'])
def trigger_email():
    data = request.json
    to_email = data.get('to_email')
    subject = data.get('subject')
    content = data.get('content')
    
    if email_service.send_email(to_email, subject, content):
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "failed"}), 500

@automation_bp.route('/trigger/email/batch', methods=['POST'])
def trigger_email_batch():
    data = request.json
    emails = data.get('emails', [])
    
    sent_count = 0
    failed_count = 0
    
    for email_data in emails:
        if email_service.send_email(
            email_data.get('to_email'),
            email_data.get('subject'),
            email_data.get('content')
        ):
            sent_count += 1
        else:
            failed_count += 1
    
    return jsonify({
        "status": "completed",
        "sent_count": sent_count,
        "failed_count": failed_count
    }), 200

@automation_bp.route('/email/templates', methods=['GET'])
def get_email_templates():
    try:
        # Mock templates - in real implementation, fetch from database
        templates = [
            {
                "id": "welcome_template",
                "name": "Welcome Email",
                "subject": "Welcome to Future Founders! 🚀",
                "content": "Hi {{name}},\n\nWe are thrilled to have you interested in the No-Code Future Academy.",
                "variables": ["name", "email"]
            },
            {
                "id": "payment_reminder",
                "name": "Payment Reminder",
                "subject": "Payment Reminder for Course Enrollment",
                "content": "Hi {{name}},\n\nThis is a friendly reminder about your pending payment for the course.",
                "variables": ["name", "amount"]
            }
        ]
        return jsonify(templates), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/email/stats', methods=['GET'])
def get_email_stats():
    try:
        if Config.MOCK_MODE:
            # Use mock service
            stats = email_service.get_email_stats()
            if stats:
                return jsonify(stats), 200
            else:
                return jsonify({"error": "Failed to get email stats"}), 500
        else:
            # Mock stats - in real implementation, calculate from database
            stats = {
                "total_sent": 1250,
                "total_failed": 25,
                "delivery_rate": 98.0,
                "last_sent": "2024-10-24T06:30:00Z"
            }
            return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/trigger/whatsapp', methods=['POST'])
def trigger_whatsapp():
    data = request.json
    to_number = data.get('to_number')
    template_name = data.get('template')
    params = data.get('params')
    
    if whatsapp_service.send_message(to_number, template_name, params):
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "failed"}), 500

@automation_bp.route('/trigger/whatsapp/bulk', methods=['POST'])
def trigger_whatsapp_bulk():
    data = request.json
    messages = data.get('messages', [])
    
    sent_count = 0
    failed_count = 0
    message_ids = []
    
    for message_data in messages:
        if whatsapp_service.send_message(
            message_data.get('to_number'),
            message_data.get('template'),
            message_data.get('params')
        ):
            sent_count += 1
            message_ids.append(f"msg_{sent_count}")
        else:
            failed_count += 1
    
    return jsonify({
        "status": "completed",
        "sent_count": sent_count,
        "failed_count": failed_count,
        "message_ids": message_ids
    }), 200

@automation_bp.route('/whatsapp/campaigns', methods=['GET'])
def get_whatsapp_campaigns():
    try:
        # Mock campaigns - in real implementation, fetch from database
        campaigns = [
            {
                "id": "campaign_1",
                "name": "Welcome Sequence - Batch 1",
                "template": "welcome_template",
                "contacts_count": 45,
                "sent_count": 45,
                "read_count": 41,
                "reply_count": 8,
                "status": "active",
                "created_at": "2024-10-24T09:00:00Z"
            },
            {
                "id": "campaign_2",
                "name": "Welcome Sequence - Batch 2",
                "template": "welcome_template",
                "contacts_count": 38,
                "sent_count": 38,
                "read_count": 35,
                "reply_count": 6,
                "status": "completed",
                "created_at": "2024-10-23T14:30:00Z"
            }
        ]
        return jsonify(campaigns), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/whatsapp/campaigns', methods=['POST'])
def create_whatsapp_campaign():
    try:
        data = request.json
        # Mock campaign creation - in real implementation, save to database
        campaign = {
            "id": f"campaign_{hash(data.get('name', '')) % 10000}",
            "name": data.get('name'),
            "template": data.get('template'),
            "contacts_count": len(data.get('contacts', [])),
            "sent_count": 0,
            "read_count": 0,
            "reply_count": 0,
            "status": "draft",
            "created_at": "2024-10-24T10:00:00Z"
        }
        return jsonify(campaign), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/whatsapp/campaigns/<campaign_id>/pause', methods=['POST'])
def pause_whatsapp_campaign(campaign_id):
    try:
        # Mock pause - in real implementation, update database
        return jsonify({"status": "paused"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/whatsapp/campaigns/<campaign_id>/resume', methods=['POST'])
def resume_whatsapp_campaign(campaign_id):
    try:
        # Mock resume - in real implementation, update database
        return jsonify({"status": "resumed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/whatsapp/templates', methods=['GET'])
def get_whatsapp_templates():
    try:
        if Config.MOCK_MODE:
            templates = whatsapp_service.get_templates()
            if templates:
                return jsonify(templates), 200
            return jsonify({"error": "Failed to get WhatsApp templates"}), 500

        # Mock templates - in real implementation, fetch from WhatsApp API
        templates = [
            {
                "id": "welcome_template",
                "name": "Welcome Message",
                "category": "MARKETING",
                "language": "en",
                "components": [
                    {"type": "BODY", "text": "Hi {{name}}, welcome to Future Founders!"}
                ]
            }
        ]
        return jsonify(templates), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/whatsapp/stats', methods=['GET'])
def get_whatsapp_stats():
    try:
        if Config.MOCK_MODE:
            # Use mock service
            stats = whatsapp_service.get_whatsapp_stats()
            if stats:
                return jsonify(stats), 200
            else:
                return jsonify({"error": "Failed to get WhatsApp stats"}), 500
        else:
            # Mock stats - in real implementation, calculate from database
            stats = {
                "total_sent": 890,
                "total_delivered": 875,
                "total_read": 805,
                "total_replied": 125,
                "read_rate": 92.0,
                "reply_rate": 14.3
            }
            return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Voice Calling Endpoints
@automation_bp.route('/trigger/call', methods=['POST'])
def trigger_call():
    data = request.json
    to_number = data.get('to_number')
    script_id = data.get('script_id')
    agent_id = data.get('agent_id')
    
    if voice_service.make_call(to_number, script_id, agent_id):
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "failed"}), 500

@automation_bp.route('/trigger/call/bulk', methods=['POST'])
def trigger_bulk_call():
    data = request.json
    contacts = data.get('contacts', [])
    script_id = data.get('script_id')
    
    if not contacts or not script_id:
        return jsonify({"error": "Missing contacts or script_id"}), 400
    
    result = voice_service.make_bulk_calls(contacts, script_id)
    return jsonify(result), 200

@automation_bp.route('/call/status/<call_id>', methods=['GET'])
def get_call_status(call_id):
    try:
        status = voice_service.get_call_status(call_id)
        if status:
            return jsonify(status), 200
        else:
            return jsonify({"error": "Call not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/call/logs', methods=['GET'])
def get_call_logs():
    try:
        limit = request.args.get('limit', 10, type=int)
        status = request.args.get('status')
        
        logs = voice_service.get_call_logs(limit, status)
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/call/stats', methods=['GET'])
def get_call_stats():
    try:
        stats = voice_service.get_call_stats()
        if stats:
            return jsonify(stats), 200
        else:
            return jsonify({"error": "Failed to get call stats"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/call/scripts', methods=['GET'])
def get_call_scripts():
    try:
        scripts = voice_service.get_available_scripts()
        return jsonify(scripts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@automation_bp.route('/call/campaigns', methods=['POST'])
def create_call_campaign():
    try:
        data = request.json
        campaign_name = data.get('name')
        contacts = data.get('contacts', [])
        script_id = data.get('script_id')
        scheduled_time = data.get('scheduled_time')
        
        if not campaign_name or not contacts or not script_id:
            return jsonify({"error": "Missing required fields"}), 400
        
        campaign = voice_service.create_campaign(campaign_name, contacts, script_id, scheduled_time)
        if campaign:
            return jsonify(campaign), 201
        else:
            return jsonify({"error": "Failed to create campaign"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

 
