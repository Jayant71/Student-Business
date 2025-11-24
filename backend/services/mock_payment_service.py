import time
import random
import uuid
from datetime import datetime, timedelta
from utils.supabase_client import supabase
from config import Config

class MockPaymentService:
    """
    Mock Payment Service that mimics Instamojo Payment Gateway API
    
    This service provides development/testing simulation of:
    - Payment link creation with Instamojo-compatible responses
    - Payment request IDs and unique URLs
    - Webhook simulation with automatic callbacks
    - Payment status tracking (Pending → Credit/Failed)
    - Transaction logging to database
    
    Response structure matches Instamojo API v1.1 exactly.
    """
    
    def __init__(self):
        self.mock_mode = Config.MOCK_MODE
        self.supabase = supabase
    
    def _log_to_supabase(self, table_name, data):
        """Log mock service actions to Supabase for visibility"""
        try:
            response = self.supabase.table(table_name).insert(data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error logging to Supabase: {e}")
            return None
    
    def _simulate_delay(self, min_sec=0.3, max_sec=1.0):
        """Simulate realistic API response time"""
        time.sleep(random.uniform(min_sec, max_sec))
    
    def _simulate_failure(self, failure_rate=0.02):
        """Simulate occasional API failures"""
        return random.random() < failure_rate
    
    def _generate_payment_request_id(self):
        """Generate Instamojo-style payment request ID"""
        return f"PR_{uuid.uuid4().hex[:16].upper()}"
    
    def _generate_payment_id(self):
        """Generate Instamojo-style payment ID for completed payments"""
        return f"MOJO{random.randint(1000000000, 9999999999)}"
    
    def create_payment_link(self, amount, purpose, buyer_name, email, phone, redirect_url=None):
        """
        Mock payment link creation that simulates Instamojo API.
        
        Returns Instamojo-compatible response:
        {
            "success": True,
            "payment_request": {
                "id": "PR_ABC123...",
                "phone": "+911234567890",
                "email": "buyer@example.com",
                "buyer_name": "John Doe",
                "amount": "499.00",
                "purpose": "Course Enrollment",
                "status": "Pending",
                "longurl": "https://test.instamojo.com/@username/pr_abc123",
                "shorturl": "https://imjo.in/abc123",
                "webhook": "https://api.yourdomain.com/webhook/",
                "created_at": "2024-01-01T12:00:00Z"
            }
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.3, 0.8)
        
        # Simulate occasional failures (2% failure rate)
        if self._simulate_failure(0.02):
            print(f"[MOCK Instamojo] ✗ Failed to create payment link for {buyer_name}")
            return {
                "success": False,
                "message": "Unable to create payment request",
                "error_code": "P001"
            }
        
        payment_request_id = self._generate_payment_request_id()
        internal_id = str(uuid.uuid4())
        
        # Generate mock URLs (Instamojo style)
        longurl = f"https://test.instamojo.com/@mock/{payment_request_id.lower()}"
        shorturl = f"https://imjo.in/{uuid.uuid4().hex[:8]}"
        
        # Log to payments table
        payment_data = {
            'id': internal_id,
            'payment_link_id': payment_request_id,
            'amount': float(amount),
            'purpose': purpose,
            'buyer_name': buyer_name,
            'email': email,
            'phone': phone,
            'status': 'Pending',
            'payment_url': longurl,
            'service': 'mock_instamojo',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'payment_request_id': payment_request_id,
                'shorturl': shorturl,
                'redirect_url': redirect_url or "http://localhost:3000/payment/success",
                'webhook_url': "http://localhost:5000/webhook/payment"
            }
        }
        
        self._log_to_supabase('payments', payment_data)
        
        print(f"[MOCK Instamojo] ✓ Payment link created")
        print(f"[MOCK Instamojo] Request ID: {payment_request_id}")
        print(f"[MOCK Instamojo] Amount: ₹{amount} - {purpose}")
        print(f"[MOCK Instamojo] URL: {longurl}")
        
        return {
            'success': True,
            'payment_request': {
                'id': payment_request_id,
                'internal_id': internal_id,
                'phone': phone,
                'email': email,
                'buyer_name': buyer_name,
                'amount': f"{amount:.2f}",
                'purpose': purpose,
                'status': 'Pending',
                'longurl': longurl,
                'shorturl': shorturl,
                'redirect_url': redirect_url or "http://localhost:3000/payment/success",
                'webhook': "http://localhost:5000/webhook/payment",
                'created_at': datetime.utcnow().isoformat()
            }
        }
    
    def simulate_payment_completion(self, payment_request_id, success_rate=0.75):
        """
        Simulate payment completion webhook (auto-triggered after delay).
        
        Returns Instamojo webhook payload:
        {
            "payment_id": "MOJO1234567890",
            "payment_request_id": "PR_ABC123",
            "status": "Credit",
            "amount": "499.00",
            "buyer_name": "John Doe",
            "buyer_email": "buyer@example.com",
            "buyer_phone": "+911234567890"
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        try:
            # Get payment from Supabase by payment_request_id
            response = self.supabase.table('payments').select('*').eq('payment_link_id', payment_request_id).execute()
            
            if not response.data:
                print(f"[MOCK Instamojo] Payment request {payment_request_id} not found")
                return {"success": False, "error": "Payment request not found"}
            
            payment = response.data[0]
            
            # Simulate payment outcome (default 75% success)
            payment_successful = random.random() < success_rate
            
            if payment_successful:
                new_status = 'Credit'  # Instamojo uses "Credit" for successful payments
                payment_id = self._generate_payment_id()
            else:
                new_status = 'Failed'
                payment_id = None
            
            # Update payment status in database
            update_data = {
                'status': new_status,
                'updated_at': datetime.utcnow().isoformat(),
                'metadata': {
                    **payment.get('metadata', {}),
                    'payment_completed': True,
                    'external_payment_id': payment_id,
                    'payment_mode': random.choice(['Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Wallet']),
                    'webhook_triggered': True,
                    'completed_at': datetime.utcnow().isoformat()
                }
            }
            
            if payment_id:
                update_data['external_payment_id'] = payment_id
            
            self.supabase.table('payments').update(update_data).eq('id', payment['id']).execute()
            
            print(f"[MOCK Instamojo] ✓ Payment {payment_request_id} completed: {new_status}")
            
            # Return webhook payload format
            webhook_payload = {
                'payment_id': payment_id if payment_id else None,
                'payment_request_id': payment_request_id,
                'status': new_status,
                'amount': f"{payment['amount']:.2f}",
                'buyer_name': payment['buyer_name'],
                'buyer_email': payment['email'],
                'buyer_phone': payment['phone'],
                'currency': 'INR',
                'fees': f"{payment['amount'] * 0.02:.2f}",  # 2% mock fee
                'mac': uuid.uuid4().hex,  # Mock MAC signature
                'created_at': datetime.utcnow().isoformat()
            }
            
            return {
                'success': True,
                'webhook_payload': webhook_payload
            }
            
        except Exception as e:
            print(f"[MOCK Instamojo] Error simulating payment completion: {e}")
            return {"success": False, "error": str(e)}
    
    def get_payment_status(self, payment_request_id):
        """
        Mock payment status check (Instamojo format).
        
        Returns:
        {
            "success": True,
            "payment_request": {
                "id": "PR_ABC123",
                "status": "Pending" | "Credit" | "Failed",
                "amount": "499.00",
                "purpose": "Course Enrollment",
                "created_at": "2024-01-01T12:00:00Z",
                "payments": []  // Array of actual payment attempts
            }
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        try:
            response = self.supabase.table('payments').select('*').eq('payment_link_id', payment_request_id).execute()
            
            if response.data:
                payment = response.data[0]
                
                # Build payments array if completed
                payments_array = []
                if payment['status'] == 'Credit' and payment.get('external_payment_id'):
                    payments_array.append({
                        'payment_id': payment['external_payment_id'],
                        'amount': f"{payment['amount']:.2f}",
                        'status': 'Credit',
                        'buyer_name': payment['buyer_name'],
                        'buyer_email': payment['email'],
                        'buyer_phone': payment['phone'],
                        'created_at': payment.get('updated_at', payment['created_at'])
                    })
                
                return {
                    'success': True,
                    'payment_request': {
                        'id': payment['payment_link_id'],
                        'status': payment['status'],
                        'amount': f"{payment['amount']:.2f}",
                        'purpose': payment['purpose'],
                        'buyer_name': payment['buyer_name'],
                        'email': payment['email'],
                        'phone': payment['phone'],
                        'longurl': payment['payment_url'],
                        'created_at': payment['created_at'],
                        'payments': payments_array
                    }
                }
            else:
                return {"success": False, "error": "Payment request not found"}
                
        except Exception as e:
            print(f"[MOCK Instamojo] Error getting payment status: {e}")
            return {"success": False, "error": str(e)}
    
    def get_payment_links(self, limit=10, status=None):
        """
        Mock payment links listing (Instamojo format).
        
        Returns array of payment requests.
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        try:
            query = self.supabase.table('payments').select('*').order('created_at', desc=True).limit(limit)
            
            if status:
                query = query.eq('status', status)
            
            response = query.execute()
            
            if response.data:
                payment_requests = []
                for payment in response.data:
                    payment_requests.append({
                        'id': payment['payment_link_id'],
                        'internal_id': payment['id'],
                        'longurl': payment['payment_url'],
                        'shorturl': payment.get('metadata', {}).get('shorturl', ''),
                        'amount': f"{payment['amount']:.2f}",
                        'purpose': payment['purpose'],
                        'buyer_name': payment['buyer_name'],
                        'email': payment['email'],
                        'phone': payment['phone'],
                        'status': payment['status'],
                        'created_at': payment['created_at'],
                        'modified_at': payment.get('updated_at', payment['created_at'])
                    })
                
                return {
                    'success': True,
                    'payment_requests': payment_requests
                }
            else:
                return {
                    'success': True,
                    'payment_requests': []
                }
                
        except Exception as e:
            print(f"[MOCK Instamojo] Error getting payment links: {e}")
            return {"success": False, "error": str(e)}
    
    def resend_payment_link(self, payment_request_id):
        """Mock payment link resend (via email/SMS)"""
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.2, 0.5)
        
        # Simulate resend success (95% success rate)
        if self._simulate_failure(0.05):
            print(f"[MOCK Instamojo] ✗ Failed to resend payment link {payment_request_id}")
            return {"success": False, "error": "Failed to send notification"}
        
        print(f"[MOCK Instamojo] ✓ Payment link {payment_request_id} resent successfully")
        return {
            "success": True,
            "message": "Payment link sent via email and SMS",
            "payment_request_id": payment_request_id
        }
    
    def process_webhook(self, webhook_data):
        """
        Mock webhook processing for payment events (Instamojo format).
        
        Expected webhook_data:
        {
            "payment_id": "MOJO1234567890",
            "payment_request_id": "PR_ABC123",
            "status": "Credit",
            "amount": "499.00",
            "buyer_name": "John Doe",
            "buyer_email": "buyer@example.com"
        }
        """
        if not self.mock_mode:
            return {"success": False, "error": "Mock mode disabled"}
        
        self._simulate_delay(0.1, 0.3)
        
        payment_request_id = webhook_data.get('payment_request_id')
        status = webhook_data.get('status')
        payment_id = webhook_data.get('payment_id')
        
        if not payment_request_id or not status:
            print("[MOCK Instamojo] ✗ Invalid webhook data")
            return {"success": False, "error": "Missing required fields"}
        
        try:
            # Find payment by payment_request_id
            response = self.supabase.table('payments').select('*').eq('payment_link_id', payment_request_id).execute()
            
            if not response.data:
                return {"success": False, "error": "Payment request not found"}
            
            payment = response.data[0]
            
            # Update payment with webhook data
            update_data = {
                'status': status,
                'external_payment_id': payment_id,
                'updated_at': datetime.utcnow().isoformat(),
                'metadata': {
                    **payment.get('metadata', {}),
                    'webhook_received': True,
                    'webhook_data': webhook_data,
                    'webhook_timestamp': datetime.utcnow().isoformat()
                }
            }
            
            self.supabase.table('payments').update(update_data).eq('id', payment['id']).execute()
            
            print(f"[MOCK Instamojo] ✓ Webhook processed: {payment_request_id} → {status}")
            
            return {
                'success': True,
                'payment_request_id': payment_request_id,
                'status': status,
                'processed_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"[MOCK Instamojo] Error processing webhook: {e}")
            return {"success": False, "error": str(e)}
    
    def get_payment_stats(self):
        """Get payment statistics from database"""
        if not self.mock_mode:
            return None
        
        try:
            response = self.supabase.table('payments').select('*').execute()
            
            if response.data:
                payments = response.data
                total_links = len(payments)
                paid_count = len([p for p in payments if p['status'] == 'Credit'])
                pending_count = len([p for p in payments if p['status'] == 'Pending'])
                failed_count = len([p for p in payments if p['status'] == 'Failed'])
                
                total_amount = sum(p['amount'] for p in payments)
                paid_amount = sum(p['amount'] for p in payments if p['status'] == 'Credit')
                pending_amount = sum(p['amount'] for p in payments if p['status'] == 'Pending')
                
                return {
                    'total_requests': total_links,
                    'total_paid': paid_count,
                    'total_pending': pending_count,
                    'total_failed': failed_count,
                    'total_amount': round(total_amount, 2),
                    'paid_amount': round(paid_amount, 2),
                    'pending_amount': round(pending_amount, 2),
                    'conversion_rate': round((paid_count / total_links * 100) if total_links > 0 else 0, 1),
                    'service': 'mock_instamojo'
                }
            else:
                return {
                    'total_requests': 0,
                    'total_paid': 0,
                    'total_pending': 0,
                    'total_failed': 0,
                    'total_amount': 0,
                    'paid_amount': 0,
                    'pending_amount': 0,
                    'conversion_rate': 0,
                    'service': 'mock_instamojo'
                }
                
        except Exception as e:
            print(f"[MOCK Instamojo] Error getting stats: {e}")
            return None