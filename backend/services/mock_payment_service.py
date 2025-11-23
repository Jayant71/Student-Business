import time
import random
import uuid
from datetime import datetime, timedelta
from utils.supabase_client import supabase
from config import Config

class MockPaymentService:
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
    
    def create_payment_link(self, amount, purpose, buyer_name, email, phone, redirect_url=None):
        """Mock payment link creation that simulates Instamojo"""
        if not self.mock_mode:
            return None
        
        # Simulate realistic response time
        time.sleep(0.4 + random.uniform(0, 0.6))
        
        # Simulate success/failure scenarios (98% success rate)
        success = random.random() > 0.02
        
        if not success:
            print(f"[MOCK] Failed to create payment link for {buyer_name}")
            return None
        
        payment_id = str(uuid.uuid4())
        payment_link_id = f"MOCK_{random.randint(100000, 999999)}"
        
        # Create mock payment link URL
        mock_url = f"https://test.instamojo.com/@mock/{payment_link_id}"
        
        # Log to payments table
        payment_data = {
            'id': payment_id,
            'payment_link_id': payment_link_id,
            'amount': amount,
            'purpose': purpose,
            'buyer_name': buyer_name,
            'email': email,
            'phone': phone,
            'status': 'Pending',
            'payment_url': mock_url,
            'service': 'mock_instamojo',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            'metadata': {
                'mock_mode': True,
                'simulated_response_time': round(time.time(), 3),
                'redirect_url': redirect_url or "http://localhost:3000/payment/success"
            }
        }
        
        self._log_to_supabase('payments', payment_data)
        
        print(f"[MOCK] Payment link created successfully")
        print(f"[MOCK] Payment ID: {payment_id}")
        print(f"[MOCK] Link: {mock_url}")
        print(f"[MOCK] Amount: {amount} - {purpose}")
        
        return {
            'id': payment_id,
            'payment_link_id': payment_link_id,
            'longurl': mock_url,
            'amount': amount,
            'purpose': purpose,
            'buyer_name': buyer_name,
            'email': email,
            'phone': phone,
            'status': 'Pending',
            'created_at': datetime.utcnow().isoformat()
        }
    
    def simulate_payment_completion(self, payment_id, success_rate=0.7):
        """Simulate payment completion webhook"""
        if not self.mock_mode:
            return None
        
        try:
            # Get payment from Supabase
            response = self.supabase.table('payments').select('*').eq('id', payment_id).execute()
            
            if not response.data:
                print(f"[MOCK] Payment {payment_id} not found")
                return None
            
            payment = response.data[0]
            
            # Simulate payment success/failure
            success = random.random() < success_rate
            
            if success:
                new_status = 'Paid'
                payment_id_external = f"PAY_{random.randint(1000000, 9999999)}"
            else:
                new_status = 'Failed'
                payment_id_external = None
            
            # Update payment status
            update_data = {
                'status': new_status,
                'updated_at': datetime.utcnow().isoformat(),
                'metadata': {
                    **payment.get('metadata', {}),
                    'payment_completed': True,
                    'external_payment_id': payment_id_external,
                    'simulated_completion': True
                }
            }
            
            if payment_id_external:
                update_data['external_payment_id'] = payment_id_external
            
            self.supabase.table('payments').update(update_data).eq('id', payment_id).execute()
            
            print(f"[MOCK] Payment {payment_id} completed with status: {new_status}")
            
            return {
                'payment_id': payment_id,
                'status': new_status,
                'external_payment_id': payment_id_external,
                'amount': payment['amount']
            }
            
        except Exception as e:
            print(f"Error simulating payment completion: {e}")
            return None
    
    def get_payment_status(self, payment_id):
        """Mock payment status check"""
        if not self.mock_mode:
            return None
        
        try:
            response = self.supabase.table('payments').select('*').eq('id', payment_id).execute()
            
            if response.data:
                payment = response.data[0]
                return {
                    'id': payment['id'],
                    'status': payment['status'],
                    'amount': payment['amount'],
                    'created_at': payment['created_at']
                }
            else:
                return None
                
        except Exception as e:
            print(f"Error getting payment status: {e}")
            return None
    
    def get_payment_links(self, limit=10, status=None):
        """Mock payment links listing"""
        if not self.mock_mode:
            return []
        
        try:
            query = self.supabase.table('payments').select('*').order('created_at', desc=True).limit(limit)
            
            if status:
                query = query.eq('status', status)
            
            response = query.execute()
            
            if response.data:
                return [
                    {
                        'id': payment['id'],
                        'payment_link_id': payment['payment_link_id'],
                        'longurl': payment['payment_url'],
                        'amount': payment['amount'],
                        'purpose': payment['purpose'],
                        'buyer_name': payment['buyer_name'],
                        'email': payment['email'],
                        'phone': payment['phone'],
                        'status': payment['status'],
                        'created_at': payment['created_at']
                    }
                    for payment in response.data
                ]
            else:
                # Return mock data if no real data
                return self._generate_mock_payment_links(limit)
                
        except Exception as e:
            print(f"Error getting payment links: {e}")
            return self._generate_mock_payment_links(limit)
    
    def _generate_mock_payment_links(self, count):
        """Generate mock payment links for testing"""
        mock_links = []
        for i in range(count):
            payment_id = str(uuid.uuid4())
            mock_links.append({
                'id': payment_id,
                'payment_link_id': f"MOCK_{random.randint(100000, 999999)}",
                'longurl': f"https://test.instamojo.com/@mock/{random.randint(100000, 999999)}",
                'amount': random.choice([199.00, 299.00, 499.00, 999.00]),
                'purpose': random.choice(['Course Enrollment', 'Workshop Fee', 'Material Fee']),
                'buyer_name': f"Student {i+1}",
                'email': f"student{i+1}@email.com",
                'phone': f"+123456789{i+1}",
                'status': random.choice(['Pending', 'Paid', 'Failed']),
                'created_at': (datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat()
            })
        return mock_links
    
    def get_payment_stats(self):
        """Mock payment statistics"""
        if not self.mock_mode:
            return None
        
        try:
            # Get actual stats from Supabase if available
            response = self.supabase.table('payments').select('*').execute()
            
            if response.data:
                payments = response.data
                total_links = len(payments)
                paid_count = len([p for p in payments if p['status'] == 'Paid'])
                pending_count = len([p for p in payments if p['status'] == 'Pending'])
                failed_count = len([p for p in payments if p['status'] == 'Failed'])
                
                total_amount = sum(p['amount'] for p in payments)
                paid_amount = sum(p['amount'] for p in payments if p['status'] == 'Paid')
                pending_amount = sum(p['amount'] for p in payments if p['status'] == 'Pending')
                
                return {
                    'total_links': total_links,
                    'total_paid': paid_count,
                    'total_pending': pending_count,
                    'total_failed': failed_count,
                    'total_amount': total_amount,
                    'paid_amount': paid_amount,
                    'pending_amount': pending_amount,
                    'conversion_rate': round((paid_count / total_links * 100) if total_links > 0 else 0, 1)
                }
            else:
                # Return mock stats if no real data
                return self._generate_mock_stats()
                
        except Exception as e:
            print(f"Error getting payment stats: {e}")
            return self._generate_mock_stats()
    
    def _generate_mock_stats(self):
        """Generate mock payment statistics"""
        total_links = random.randint(20, 100)
        paid_count = int(total_links * random.uniform(0.6, 0.8))
        pending_count = int(total_links * random.uniform(0.1, 0.3))
        failed_count = total_links - paid_count - pending_count
        
        avg_amount = random.uniform(200, 500)
        total_amount = total_links * avg_amount
        paid_amount = paid_count * avg_amount
        pending_amount = pending_count * avg_amount
        
        return {
            'total_links': total_links,
            'total_paid': paid_count,
            'total_pending': pending_count,
            'total_failed': failed_count,
            'total_amount': round(total_amount, 2),
            'paid_amount': round(paid_amount, 2),
            'pending_amount': round(pending_amount, 2),
            'conversion_rate': round((paid_count / total_links * 100) if total_links > 0 else 0, 1)
        }
    
    def resend_payment_link(self, payment_id):
        """Mock payment link resend"""
        if not self.mock_mode:
            return False
        
        time.sleep(0.2 + random.uniform(0, 0.3))
        
        # Simulate resend success (95% success rate)
        success = random.random() > 0.05
        
        if success:
            print(f"[MOCK] Payment link {payment_id} resent successfully")
            return True
        else:
            print(f"[MOCK] Failed to resend payment link {payment_id}")
            return False
    
    def process_webhook(self, webhook_data):
        """Mock webhook processing for payment events"""
        if not self.mock_mode:
            return None
        
        # Simulate webhook processing time
        time.sleep(0.1 + random.uniform(0, 0.2))
        
        payment_id = webhook_data.get('payment_id')
        status = webhook_data.get('status')
        
        if not payment_id or not status:
            print("[MOCK] Invalid webhook data")
            return None
        
        # Update payment status based on webhook
        try:
            self.supabase.table('payments').update({
                'status': status,
                'updated_at': datetime.utcnow().isoformat(),
                'metadata': {
                    'webhook_received': True,
                    'webhook_data': webhook_data
                }
            }).eq('id', payment_id).execute()
            
            print(f"[MOCK] Webhook processed: Payment {payment_id} status updated to {status}")
            
            return {
                'payment_id': payment_id,
                'status': status,
                'processed': True
            }
            
        except Exception as e:
            print(f"Error processing webhook: {e}")
            return None