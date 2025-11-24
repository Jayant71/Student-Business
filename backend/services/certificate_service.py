"""
Certificate Generation Service

Handles certificate generation, delivery, and verification for completed courses.
Generates PDF certificates with QR codes, digital signatures, and unique IDs.
"""

import os
import io
import qrcode
import hashlib
import secrets
from datetime import datetime
from typing import Dict, Any, Optional, List
from PIL import Image
from supabase import Client
from .email_service import get_email_service
from .whatsapp_service import get_whatsapp_service

# Try to import WeasyPrint, but allow app to start without it
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except (OSError, ImportError) as e:
    print(f"⚠️  WeasyPrint not available: {e}")
    print("⚠️  Certificate PDF generation will be disabled.")
    print("⚠️  To enable, install GTK+ libraries: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows")
    WEASYPRINT_AVAILABLE = False
    HTML = None
    CSS = None


class CertificateService:
    """Service for generating and managing course completion certificates"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.email_service = get_email_service()
        self.whatsapp_service = get_whatsapp_service()
        self.base_url = os.getenv('APP_BASE_URL', 'https://app.example.com')
        
    def generate_certificate(
        self,
        student_id: str,
        course_name: str,
        completion_date: Optional[str] = None,
        grade: Optional[str] = None,
        admin_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a certificate for a student
        
        Args:
            student_id: UUID of the student
            course_name: Name of the course
            completion_date: Date of completion (defaults to today)
            grade: Grade/score achieved (optional)
            admin_id: UUID of admin generating certificate (optional)
            
        Returns:
            Dict with success status, certificate_id, and file_url
        """
        try:
            # Get student details
            student_response = self.supabase.table('profiles').select('*').eq('id', student_id).execute()
            if not student_response.data:
                return {'success': False, 'error': 'Student not found'}
            
            student = student_response.data[0]
            student_name = student.get('full_name') or student.get('email')
            
            # Generate unique certificate ID
            certificate_id = self._generate_certificate_id(student_id, course_name)
            
            # Use today's date if not provided
            if not completion_date:
                completion_date = datetime.utcnow().strftime('%Y-%m-%d')
            
            # Generate certificate PDF
            pdf_bytes = self._generate_pdf(
                student_name=student_name,
                course_name=course_name,
                completion_date=completion_date,
                certificate_id=certificate_id,
                grade=grade
            )
            
            # Upload to Supabase Storage
            file_url = self._upload_certificate(certificate_id, pdf_bytes)
            
            # Save certificate record to database
            certificate_data = {
                'student_id': student_id,
                'certificate_id': certificate_id,
                'course_name': course_name,
                'issued_at': completion_date,
                'grade': grade,
                'file_url': file_url,
                'issued_by': admin_id
            }
            
            cert_response = self.supabase.table('certificates').insert(certificate_data).execute()
            
            if not cert_response.data:
                return {'success': False, 'error': 'Failed to save certificate record'}
            
            # Send certificate to student
            delivery_result = self._deliver_certificate(
                student_email=student.get('email'),
                student_phone=student.get('phone'),
                student_name=student_name,
                course_name=course_name,
                file_url=file_url,
                certificate_id=certificate_id
            )
            
            return {
                'success': True,
                'certificate_id': certificate_id,
                'file_url': file_url,
                'delivery': delivery_result
            }
            
        except Exception as e:
            print(f"[Certificate Service] Error generating certificate: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _generate_certificate_id(self, student_id: str, course_name: str) -> str:
        """Generate unique certificate ID"""
        # Format: CERT-YYYYMMDD-HASH
        date_str = datetime.utcnow().strftime('%Y%m%d')
        hash_input = f"{student_id}_{course_name}_{datetime.utcnow().isoformat()}_{secrets.token_hex(8)}"
        hash_value = hashlib.sha256(hash_input.encode()).hexdigest()[:8].upper()
        return f"CERT-{date_str}-{hash_value}"
    
    def _generate_pdf(
        self,
        student_name: str,
        course_name: str,
        completion_date: str,
        certificate_id: str,
        grade: Optional[str] = None
    ) -> bytes:
        """Generate PDF certificate from HTML template"""
        
        # Check if WeasyPrint is available
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError(
                "WeasyPrint is not available. PDF generation is disabled. "
                "To enable, install GTK+ libraries: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
            )
        
        # Generate QR code for verification
        qr_data_url = self._generate_qr_code(certificate_id)
        
        # Format completion date
        try:
            date_obj = datetime.strptime(completion_date, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%B %d, %Y')
        except:
            formatted_date = completion_date
        
        # Build HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{
                    size: A4 landscape;
                    margin: 0;
                }}
                
                body {{
                    margin: 0;
                    padding: 0;
                    font-family: 'Georgia', serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    height: 297mm;
                    width: 210mm;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }}
                
                .certificate {{
                    background: white;
                    width: 90%;
                    height: 90%;
                    padding: 40px;
                    box-shadow: 0 10px 50px rgba(0,0,0,0.3);
                    position: relative;
                    border: 20px solid #f0f0f0;
                    border-image: linear-gradient(45deg, #667eea, #764ba2) 1;
                }}
                
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                
                .logo {{
                    font-size: 36px;
                    font-weight: bold;
                    color: #667eea;
                    margin-bottom: 10px;
                }}
                
                .title {{
                    font-size: 48px;
                    color: #333;
                    margin: 20px 0;
                    font-weight: bold;
                    letter-spacing: 2px;
                }}
                
                .subtitle {{
                    font-size: 18px;
                    color: #666;
                    margin-bottom: 40px;
                }}
                
                .content {{
                    text-align: center;
                    margin: 40px 0;
                }}
                
                .awarded-to {{
                    font-size: 20px;
                    color: #666;
                    margin-bottom: 15px;
                }}
                
                .student-name {{
                    font-size: 42px;
                    color: #333;
                    font-weight: bold;
                    margin: 20px 0;
                    border-bottom: 3px solid #667eea;
                    display: inline-block;
                    padding-bottom: 10px;
                }}
                
                .completion-text {{
                    font-size: 18px;
                    color: #666;
                    margin: 30px 0;
                    line-height: 1.6;
                }}
                
                .course-name {{
                    font-size: 28px;
                    color: #667eea;
                    font-weight: bold;
                    margin: 20px 0;
                }}
                
                .grade {{
                    font-size: 22px;
                    color: #764ba2;
                    margin: 20px 0;
                }}
                
                .footer {{
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 60px;
                    padding-top: 30px;
                    border-top: 2px solid #eee;
                }}
                
                .signature {{
                    text-align: center;
                    flex: 1;
                }}
                
                .signature-line {{
                    border-top: 2px solid #333;
                    width: 200px;
                    margin: 0 auto 10px;
                }}
                
                .signature-name {{
                    font-size: 16px;
                    font-weight: bold;
                    color: #333;
                }}
                
                .signature-title {{
                    font-size: 14px;
                    color: #666;
                }}
                
                .qr-section {{
                    text-align: center;
                    flex: 1;
                }}
                
                .qr-code {{
                    width: 100px;
                    height: 100px;
                    margin-bottom: 10px;
                }}
                
                .certificate-id {{
                    font-size: 12px;
                    color: #999;
                    font-family: monospace;
                }}
                
                .date {{
                    font-size: 16px;
                    color: #666;
                    margin-top: 20px;
                }}
                
                .watermark {{
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 120px;
                    color: rgba(102, 126, 234, 0.05);
                    font-weight: bold;
                    z-index: 0;
                    pointer-events: none;
                }}
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="watermark">CERTIFIED</div>
                
                <div class="header">
                    <div class="logo">🎓 Futura Learning</div>
                    <div class="title">Certificate of Completion</div>
                    <div class="subtitle">This is to certify that</div>
                </div>
                
                <div class="content">
                    <div class="student-name">{student_name}</div>
                    
                    <div class="completion-text">
                        has successfully completed the course
                    </div>
                    
                    <div class="course-name">{course_name}</div>
                    
                    {"<div class='grade'>Grade: " + grade + "</div>" if grade else ""}
                    
                    <div class="date">Issued on {formatted_date}</div>
                </div>
                
                <div class="footer">
                    <div class="signature">
                        <div class="signature-line"></div>
                        <div class="signature-name">Director</div>
                        <div class="signature-title">Futura Learning</div>
                    </div>
                    
                    <div class="qr-section">
                        <img src="{qr_data_url}" alt="QR Code" class="qr-code">
                        <div class="certificate-id">ID: {certificate_id}</div>
                        <div class="signature-title">Scan to verify</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Generate PDF
        pdf = HTML(string=html_content).write_pdf()
        return pdf
    
    def _generate_qr_code(self, certificate_id: str) -> str:
        """Generate QR code for certificate verification"""
        # Verification URL
        verify_url = f"{self.base_url}/verify/{certificate_id}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=2,
        )
        qr.add_data(verify_url)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to data URL
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        import base64
        img_data = base64.b64encode(buffer.read()).decode()
        return f"data:image/png;base64,{img_data}"
    
    def _upload_certificate(self, certificate_id: str, pdf_bytes: bytes) -> str:
        """Upload certificate PDF to Supabase Storage"""
        try:
            # Upload to certificates bucket
            file_path = f"certificates/{certificate_id}.pdf"
            
            self.supabase.storage.from_('certificates').upload(
                path=file_path,
                file=pdf_bytes,
                file_options={"content-type": "application/pdf"}
            )
            
            # Get public URL
            file_url = self.supabase.storage.from_('certificates').get_public_url(file_path)
            return file_url
            
        except Exception as e:
            print(f"[Certificate Service] Upload error: {str(e)}")
            # Fallback: save to local filesystem (development)
            local_path = f"/tmp/certificates/{certificate_id}.pdf"
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, 'wb') as f:
                f.write(pdf_bytes)
            return f"file://{local_path}"
    
    def _deliver_certificate(
        self,
        student_email: str,
        student_phone: Optional[str],
        student_name: str,
        course_name: str,
        file_url: str,
        certificate_id: str
    ) -> Dict[str, Any]:
        """Deliver certificate via email and WhatsApp"""
        results = {}
        
        # Send email
        try:
            email_html = self._format_certificate_email(
                student_name=student_name,
                course_name=course_name,
                file_url=file_url,
                certificate_id=certificate_id
            )
            
            email_result = self.email_service.send_email(
                to_email=student_email,
                subject=f"🎉 Your Certificate: {course_name}",
                html_content=email_html
            )
            results['email'] = email_result
            
        except Exception as e:
            print(f"[Certificate Service] Email delivery error: {str(e)}")
            results['email'] = {'success': False, 'error': str(e)}
        
        # Send WhatsApp notification
        if student_phone:
            try:
                whatsapp_message = (
                    f"🎉 Congratulations {student_name}!\n\n"
                    f"You've successfully completed: {course_name}\n\n"
                    f"📜 Download your certificate:\n{file_url}\n\n"
                    f"Certificate ID: {certificate_id}"
                )
                
                whatsapp_result = self.whatsapp_service.send_message(
                    phone=student_phone,
                    message=whatsapp_message
                )
                results['whatsapp'] = whatsapp_result
                
            except Exception as e:
                print(f"[Certificate Service] WhatsApp delivery error: {str(e)}")
                results['whatsapp'] = {'success': False, 'error': str(e)}
        
        return results
    
    def _format_certificate_email(
        self,
        student_name: str,
        course_name: str,
        file_url: str,
        certificate_id: str
    ) -> str:
        """Format certificate delivery email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .certificate-box {{
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid #667eea;
                }}
                .button {{
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .certificate-id {{
                    font-family: monospace;
                    background: #f0f0f0;
                    padding: 10px;
                    border-radius: 5px;
                    display: inline-block;
                    margin-top: 10px;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p>You've earned your certificate</p>
            </div>
            
            <div class="content">
                <p>Dear {student_name},</p>
                
                <p>Congratulations on successfully completing <strong>{course_name}</strong>!</p>
                
                <div class="certificate-box">
                    <h3>📜 Your Certificate is Ready</h3>
                    <p>We're proud to present you with your certificate of completion. This represents your dedication and hard work throughout the course.</p>
                    
                    <a href="{file_url}" class="button">Download Certificate</a>
                    
                    <p>Certificate ID: <span class="certificate-id">{certificate_id}</span></p>
                </div>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>📤 Share your achievement on LinkedIn</li>
                    <li>💼 Add this certification to your resume</li>
                    <li>🔍 Verify your certificate anytime at {self.base_url}/verify/{certificate_id}</li>
                    <li>📚 Explore our advanced courses to continue learning</li>
                </ul>
                
                <p>Thank you for being part of our learning community!</p>
                
                <p>Best regards,<br>
                <strong>The Futura Learning Team</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2025 Futura Learning. All rights reserved.</p>
                <p>Questions? Contact us at support@futuralearning.com</p>
            </div>
        </body>
        </html>
        """
    
    def verify_certificate(self, certificate_id: str) -> Dict[str, Any]:
        """
        Verify certificate authenticity
        
        Args:
            certificate_id: Certificate ID to verify
            
        Returns:
            Dict with verification status and certificate details
        """
        try:
            response = self.supabase.table('certificates').select(
                'id, certificate_id, student_id, course_name, issued_at, grade, profiles(full_name, email)'
            ).eq('certificate_id', certificate_id).execute()
            
            if not response.data:
                return {
                    'valid': False,
                    'error': 'Certificate not found'
                }
            
            cert = response.data[0]
            student = cert.get('profiles', {})
            
            return {
                'valid': True,
                'certificate': {
                    'id': cert['certificate_id'],
                    'student_name': student.get('full_name'),
                    'course_name': cert['course_name'],
                    'issued_at': cert['issued_at'],
                    'grade': cert.get('grade')
                }
            }
            
        except Exception as e:
            print(f"[Certificate Service] Verification error: {str(e)}")
            return {'valid': False, 'error': str(e)}
    
    def get_student_certificates(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all certificates for a student"""
        try:
            response = self.supabase.table('certificates').select('*').eq(
                'student_id', student_id
            ).order('issued_at', desc=True).execute()
            
            return response.data or []
            
        except Exception as e:
            print(f"[Certificate Service] Error fetching certificates: {str(e)}")
            return []
    
    def revoke_certificate(self, certificate_id: str, admin_id: str, reason: str) -> Dict[str, Any]:
        """Revoke a certificate"""
        try:
            response = self.supabase.table('certificates').update({
                'revoked': True,
                'revoked_at': datetime.utcnow().isoformat(),
                'revoked_by': admin_id,
                'revoke_reason': reason
            }).eq('certificate_id', certificate_id).execute()
            
            if response.data:
                return {'success': True, 'message': 'Certificate revoked'}
            return {'success': False, 'error': 'Certificate not found'}
            
        except Exception as e:
            print(f"[Certificate Service] Revoke error: {str(e)}")
            return {'success': False, 'error': str(e)}


# Singleton instance
_certificate_service_instance = None

def get_certificate_service(supabase_client: Client = None) -> CertificateService:
    """Get or create certificate service instance"""
    global _certificate_service_instance
    if _certificate_service_instance is None:
        if supabase_client is None:
            from utils.supabase_client import get_supabase_client
            supabase_client = get_supabase_client()
        _certificate_service_instance = CertificateService(supabase_client)
    return _certificate_service_instance


# CLI for testing
if __name__ == "__main__":
    import sys
    from utils.supabase_client import get_supabase_client
    
    if len(sys.argv) < 4:
        print("Usage: python certificate_service.py <student_id> <course_name> [grade]")
        sys.exit(1)
    
    student_id = sys.argv[1]
    course_name = sys.argv[2]
    grade = sys.argv[3] if len(sys.argv) > 3 else None
    
    supabase = get_supabase_client()
    service = CertificateService(supabase)
    
    print(f"Generating certificate for student {student_id}...")
    result = service.generate_certificate(
        student_id=student_id,
        course_name=course_name,
        grade=grade
    )
    
    if result['success']:
        print(f"✓ Certificate generated successfully!")
        print(f"  Certificate ID: {result['certificate_id']}")
        print(f"  File URL: {result['file_url']}")
        print(f"  Delivery: {result['delivery']}")
    else:
        print(f"✗ Error: {result['error']}")
