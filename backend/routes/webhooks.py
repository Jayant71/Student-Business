from flask import Blueprint, request, jsonify
from services.payment_service import PaymentService
from services.mock_payment_service import MockPaymentService
from utils.supabase_client import supabase
from config import Config

webhooks_bp = Blueprint('webhooks', __name__)

# Use mock payment service if in mock mode
if Config.MOCK_MODE:
    payment_service = MockPaymentService()
    print("[MOCK MODE] Using mock payment service for webhooks")
else:
    payment_service = PaymentService()

@webhooks_bp.route('/payment/webhook', methods=['POST'])
def payment_webhook():
    try:
        if Config.MOCK_MODE:
            # Handle mock webhook data
            data = request.get_json() or request.form.to_dict()
            payment_id = data.get('payment_id')
            payment_status = data.get('status')
            
            if payment_id and payment_status:
                # Use mock service to process webhook
                result = payment_service.process_webhook(data)
                if result:
                    return jsonify({"status": "received", "processed": True}), 200
                else:
                    return jsonify({"error": "Failed to process webhook"}), 500
            else:
                return jsonify({"error": "Missing payment_id or status"}), 400
        else:
            # Real webhook processing
            data = request.form
            payment_id = data.get('payment_id')
            payment_status = data.get('status')
            
            # Verify payment with Instamojo (optional but recommended)
            # Update Supabase payment status
            # This is a simplified example. In production, verify the webhook signature.
            if payment_status == 'Credit':
                 # Update payment status in Supabase
                 # supabase.table('payments').update({'status': 'paid'}).eq('payment_id', payment_id).execute()
                 print(f"Payment {payment_id} successful")
                 
            return jsonify({"status": "received"}), 200
    except Exception as e:
        print(f"Error processing webhook: {e}")
        return jsonify({"error": str(e)}), 500

@webhooks_bp.route('/crm/whatsapp', methods=['POST'])
def whatsapp_webhook():
    data = request.json
    try:
        # Process incoming WhatsApp message
        print(f"Received WhatsApp webhook: {data}")
        
        # Extract message details
        message_data = data.get('message', {})
        contact_data = data.get('contact', {})
        
        if message_data and contact_data:
            # Find user by phone number
            phone = contact_data.get('phone', '')
            if not phone:
                return jsonify({"error": "No phone number provided"}), 400
            
            # Get user from profiles
            user_response = supabase.table('profiles').select('*').eq('phone', phone).execute()
            
            if user_response.data and len(user_response.data) > 0:
                user = user_response.data[0]
                
                # Store message in crm_messages
                message_record = {
                    'user_id': user['id'],
                    'channel': 'whatsapp',
                    'sender': 'user',
                    'message': message_data.get('text', ''),
                    'delivery_status': 'delivered',
                    'delivered_at': 'now()',
                    'meta': {
                        'webhook_data': data,
                        'contact_name': contact_data.get('name', ''),
                        'external_message_id': message_data.get('id', '')
                    }
                }
                
                supabase.table('crm_messages').insert(message_record).execute()
                
                # Log the webhook
                log_record = {
                    'user_id': user['id'],
                    'phone': phone,
                    'direction': 'inbound',
                    'message': message_data.get('text', ''),
                    'status': 'received',
                    'response_data': data
                }
                
                supabase.table('whatsapp_logs').insert(log_record).execute()
                
                return jsonify({"status": "received", "user_id": user['id']}), 200
            else:
                return jsonify({"error": "User not found"}), 404
        else:
            return jsonify({"error": "Invalid message data"}), 400
            
    except Exception as e:
        print(f"Error processing WhatsApp webhook: {e}")
        return jsonify({"error": str(e)}), 500

@webhooks_bp.route('/crm/email', methods=['POST'])
def email_webhook():
    data = request.json
    try:
        # Process incoming email reply
        print(f"Received email webhook: {data}")
        
        # Extract email details
        email_data = data.get('email', {})
        sender_email = email_data.get('from', '')
        
        if not sender_email:
            return jsonify({"error": "No sender email provided"}), 400
        
        # Get user by email
        user_response = supabase.table('profiles').select('*').eq('email', sender_email).execute()
        
        if user_response.data and len(user_response.data) > 0:
            user = user_response.data[0]
            
            # Store message in crm_messages
            message_record = {
                'user_id': user['id'],
                'channel': 'email',
                'sender': 'user',
                'message': email_data.get('text', '') or email_data.get('html', ''),
                'delivery_status': 'delivered',
                'delivered_at': 'now()',
                'meta': {
                    'webhook_data': data,
                    'subject': email_data.get('subject', ''),
                    'external_message_id': email_data.get('message_id', '')
                }
            }
            
            supabase.table('crm_messages').insert(message_record).execute()
            
            # Log the email
            log_record = {
                'user_id': user['id'],
                'email_address': sender_email,
                'template_name': 'reply',
                'status': 'received',
                'response_data': data
            }
            
            supabase.table('email_logs').insert(log_record).execute()
            
            return jsonify({"status": "received", "user_id": user['id']}), 200
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        print(f"Error processing email webhook: {e}")
        return jsonify({"error": str(e)}), 500

@webhooks_bp.route('/crm/delivery-status', methods=['POST'])
def delivery_status_webhook():
    data = request.json
    try:
        # Update message delivery status
        print(f"Received delivery status webhook: {data}")
        
        message_id = data.get('message_id')
        status = data.get('status')  # 'sent', 'delivered', 'read', 'failed'
        channel = data.get('channel', 'whatsapp')
        
        if not message_id or not status:
            return jsonify({"error": "Missing message_id or status"}), 400
        
        # Update the message status
        update_data = {
            'delivery_status': status
        }
        
        if status == 'delivered':
            update_data['delivered_at'] = 'now()'
        elif status == 'read':
            update_data['read_at'] = 'now()'
            update_data['delivered_at'] = 'now()'
        
        supabase.table('crm_messages').update(update_data).eq('external_message_id', message_id).execute()
        
        return jsonify({"status": "updated"}), 200
        
    except Exception as e:
        print(f"Error processing delivery status webhook: {e}")
        return jsonify({"error": str(e)}), 500
