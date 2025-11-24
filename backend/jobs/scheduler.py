"""
Background Job Scheduler for Automated Workflows
================================================

Handles all scheduled tasks and automation workflows using APScheduler.

Features:
- Session reminders (24h and 15min before)
- Recording availability notifications
- Payment follow-ups
- Lead nurturing campaigns
- Assignment deadline reminders
- Certificate generation triggers

Usage:
------
# Start scheduler with Flask app
from jobs.scheduler import init_scheduler, shutdown_scheduler

app = Flask(__name__)
scheduler = init_scheduler(app)

# Shutdown on app exit
atexit.register(lambda: shutdown_scheduler(scheduler))
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
import logging
from typing import Optional
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_client import supabase
from services.email_service import get_email_service
from services.whatsapp_service import get_whatsapp_service
from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class JobScheduler:
    """Manages all background jobs and scheduled tasks"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler(
            timezone='UTC',
            job_defaults={
                'coalesce': True,  # Combine missed runs
                'max_instances': 1,  # One instance per job
                'misfire_grace_time': 300  # 5 minutes grace period
            }
        )
        self.email_service = get_email_service()
        self.whatsapp_service = get_whatsapp_service()
        logger.info("[Scheduler] Initialized background job scheduler")
    
    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("[Scheduler] ✓ Scheduler started successfully")
            self._log_scheduled_jobs()
    
    def shutdown(self):
        """Shutdown the scheduler gracefully"""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("[Scheduler] ✓ Scheduler shut down successfully")
    
    def _log_scheduled_jobs(self):
        """Log all scheduled jobs"""
        jobs = self.scheduler.get_jobs()
        logger.info(f"[Scheduler] Active jobs: {len(jobs)}")
        for job in jobs:
            logger.info(f"[Scheduler]   - {job.id}: {job.name} (next run: {job.next_run_time})")
    
    # ===================================================================
    # Session Reminder Jobs
    # ===================================================================
    
    def check_session_reminders_24h(self):
        """Send reminders 24 hours before sessions"""
        try:
            logger.info("[Scheduler] Checking for 24-hour session reminders...")
            
            # Get sessions starting in 23-25 hours (1-hour window)
            now = datetime.utcnow()
            start_window = now + timedelta(hours=23)
            end_window = now + timedelta(hours=25)
            
            response = supabase.table('sessions') \
                .select('*, enrollments(student_id, profiles(full_name, email, phone))') \
                .gte('scheduled_at', start_window.isoformat()) \
                .lte('scheduled_at', end_window.isoformat()) \
                .eq('reminder_24h_sent', False) \
                .execute()
            
            sessions = response.data if response.data else []
            
            for session in sessions:
                self._send_session_reminder(session, '24h')
            
            logger.info(f"[Scheduler] ✓ Processed {len(sessions)} 24-hour reminders")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error in 24h reminder job: {str(e)}")
    
    def check_session_reminders_15min(self):
        """Send reminders 15 minutes before sessions"""
        try:
            logger.info("[Scheduler] Checking for 15-minute session reminders...")
            
            # Get sessions starting in 10-20 minutes (10-min window)
            now = datetime.utcnow()
            start_window = now + timedelta(minutes=10)
            end_window = now + timedelta(minutes=20)
            
            response = supabase.table('sessions') \
                .select('*, enrollments(student_id, profiles(full_name, email, phone))') \
                .gte('scheduled_at', start_window.isoformat()) \
                .lte('scheduled_at', end_window.isoformat()) \
                .eq('reminder_15min_sent', False) \
                .execute()
            
            sessions = response.data if response.data else []
            
            for session in sessions:
                self._send_session_reminder(session, '15min')
            
            logger.info(f"[Scheduler] ✓ Processed {len(sessions)} 15-minute reminders")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error in 15min reminder job: {str(e)}")
    
    def _send_session_reminder(self, session, reminder_type):
        """Send session reminder to enrolled students"""
        try:
            session_title = session.get('title', 'Upcoming Session')
            scheduled_at = session.get('scheduled_at')
            meeting_link = session.get('zoom_join_url') or session.get('meeting_link')
            
            enrollments = session.get('enrollments', [])
            
            for enrollment in enrollments:
                profile = enrollment.get('profiles', {})
                student_name = profile.get('full_name', 'Student')
                student_email = profile.get('email')
                student_phone = profile.get('phone')
                
                # Email reminder
                if student_email:
                    self.email_service.send_email(
                        to_email=student_email,
                        subject=f"{'Starts Tomorrow' if reminder_type == '24h' else 'Starting Soon'}: {session_title}",
                        content=self._format_reminder_email(
                            student_name, session_title, scheduled_at, 
                            meeting_link, reminder_type
                        )
                    )
                
                # WhatsApp reminder
                if student_phone:
                    self.whatsapp_service.send_message(
                        to_number=student_phone,
                        template_name='session_reminder',
                        params={
                            'student_name': student_name,
                            'session_title': session_title,
                            'time': scheduled_at,
                            'meeting_link': meeting_link or 'Will be shared soon'
                        }
                    )
            
            # Mark reminder as sent
            field = 'reminder_24h_sent' if reminder_type == '24h' else 'reminder_15min_sent'
            supabase.table('sessions').update({field: True}).eq('id', session['id']).execute()
            
            logger.info(f"[Scheduler] ✓ Sent {reminder_type} reminders for session: {session['id']}")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error sending reminder for session {session.get('id')}: {str(e)}")
    
    def _format_reminder_email(self, name, title, scheduled_at, link, reminder_type):
        """Format reminder email content"""
        time_text = "tomorrow" if reminder_type == "24h" else "in 15 minutes"
        
        return f"""
        <html>
        <body>
            <h2>Hi {name},</h2>
            <p>Your session <strong>"{title}"</strong> starts {time_text}!</p>
            
            <p><strong>Scheduled Time:</strong> {scheduled_at}</p>
            
            {f'<p><strong>Join Meeting:</strong><br><a href="{link}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Join Now</a></p>' if link else '<p>Meeting link will be shared shortly.</p>'}
            
            <p>See you there!</p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you have any questions, please contact support.
            </p>
        </body>
        </html>
        """
    
    # ===================================================================
    # Recording Notification Jobs
    # ===================================================================
    
    def check_recording_availability(self):
        """Check for newly available recordings and notify students"""
        try:
            logger.info("[Scheduler] Checking for available recordings...")
            
            # Get recordings that are visible but notification not sent
            response = supabase.table('recordings') \
                .select('*, sessions(title, enrollments(profiles(full_name, email)))') \
                .eq('visible_to_students', True) \
                .eq('notification_sent', False) \
                .execute()
            
            recordings = response.data if response.data else []
            
            for recording in recordings:
                self._send_recording_notification(recording)
            
            logger.info(f"[Scheduler] ✓ Processed {len(recordings)} recording notifications")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error in recording notification job: {str(e)}")
    
    def _send_recording_notification(self, recording):
        """Send recording available notification"""
        try:
            session = recording.get('sessions', {})
            session_title = session.get('title', 'Session')
            video_url = recording.get('video_url')
            
            enrollments = session.get('enrollments', [])
            
            for enrollment in enrollments:
                profile = enrollment.get('profiles', {})
                student_name = profile.get('full_name', 'Student')
                student_email = profile.get('email')
                
                if student_email:
                    self.email_service.send_email(
                        to_email=student_email,
                        subject=f"Recording Available: {session_title}",
                        content=f"""
                        <html>
                        <body>
                            <h2>Hi {student_name},</h2>
                            <p>The recording for <strong>"{session_title}"</strong> is now available!</p>
                            
                            <p><a href="{video_url}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Watch Recording</a></p>
                            
                            <p>You can access all your recordings from your student dashboard.</p>
                        </body>
                        </html>
                        """
                    )
            
            # Mark notification as sent
            supabase.table('recordings').update({'notification_sent': True}).eq('id', recording['id']).execute()
            
            logger.info(f"[Scheduler] ✓ Sent recording notification for: {recording['id']}")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error sending recording notification: {str(e)}")
    
    # ===================================================================
    # Assignment Reminder Jobs
    # ===================================================================
    
    def check_assignment_deadlines(self):
        """Check for upcoming assignment deadlines"""
        try:
            logger.info("[Scheduler] Checking assignment deadlines...")
            
            # Get assignments due in 24-48 hours
            now = datetime.utcnow()
            start_window = now + timedelta(hours=24)
            end_window = now + timedelta(hours=48)
            
            response = supabase.table('assignments') \
                .select('*, profiles(full_name, email)') \
                .gte('deadline', start_window.isoformat()) \
                .lte('deadline', end_window.isoformat()) \
                .eq('reminder_sent', False) \
                .is_('submitted_at', 'null') \
                .execute()
            
            assignments = response.data if response.data else []
            
            for assignment in assignments:
                self._send_assignment_reminder(assignment)
            
            logger.info(f"[Scheduler] ✓ Processed {len(assignments)} assignment reminders")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error in assignment reminder job: {str(e)}")
    
    def _send_assignment_reminder(self, assignment):
        """Send assignment deadline reminder"""
        try:
            profile = assignment.get('profiles', {})
            student_name = profile.get('full_name', 'Student')
            student_email = profile.get('email')
            
            title = assignment.get('title', 'Assignment')
            deadline = assignment.get('deadline')
            
            if student_email:
                self.email_service.send_email(
                    to_email=student_email,
                    subject=f"Assignment Due Soon: {title}",
                    content=f"""
                    <html>
                    <body>
                        <h2>Hi {student_name},</h2>
                        <p>Reminder: Your assignment <strong>"{title}"</strong> is due soon!</p>
                        
                        <p><strong>Deadline:</strong> {deadline}</p>
                        
                        <p>Please submit your work before the deadline to avoid late penalties.</p>
                        
                        <p><a href="http://your-app.com/student/assignments" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Submit Assignment</a></p>
                    </body>
                    </html>
                    """
                )
            
            # Mark reminder as sent
            supabase.table('assignments').update({'reminder_sent': True}).eq('id', assignment['id']).execute()
            
            logger.info(f"[Scheduler] ✓ Sent assignment reminder for: {assignment['id']}")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error sending assignment reminder: {str(e)}")
    
    # ===================================================================
    # Payment Follow-up Jobs
    # ===================================================================
    
    def check_pending_payments(self):
        """Check for pending payments and send reminders"""
        try:
            logger.info("[Scheduler] Checking pending payments...")
            
            # Get payments pending for more than 3 days
            cutoff_date = (datetime.utcnow() - timedelta(days=3)).isoformat()
            
            response = supabase.table('payments') \
                .select('*, profiles(full_name, email, phone)') \
                .eq('status', 'pending') \
                .lte('created_at', cutoff_date) \
                .eq('reminder_sent', False) \
                .execute()
            
            payments = response.data if response.data else []
            
            for payment in payments:
                self._send_payment_reminder(payment)
            
            logger.info(f"[Scheduler] ✓ Processed {len(payments)} payment reminders")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error in payment reminder job: {str(e)}")
    
    def _send_payment_reminder(self, payment):
        """Send payment reminder"""
        try:
            profile = payment.get('profiles', {})
            student_name = profile.get('full_name', 'Student')
            student_email = profile.get('email')
            student_phone = profile.get('phone')
            
            amount = payment.get('amount', 0)
            payment_link = payment.get('payment_link')
            
            # Email reminder
            if student_email:
                self.email_service.send_email(
                    to_email=student_email,
                    subject="Payment Reminder",
                    content=f"""
                    <html>
                    <body>
                        <h2>Hi {student_name},</h2>
                        <p>This is a friendly reminder about your pending payment.</p>
                        
                        <p><strong>Amount:</strong> ₹{amount}</p>
                        
                        {f'<p><a href="{payment_link}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Complete Payment</a></p>' if payment_link else ''}
                        
                        <p>If you've already paid, please ignore this message.</p>
                    </body>
                    </html>
                    """
                )
            
            # WhatsApp reminder
            if student_phone:
                self.whatsapp_service.send_message(
                    to_number=student_phone,
                    template_name='payment_reminder',
                    params={
                        'student_name': student_name,
                        'amount': str(amount),
                        'payment_link': payment_link or 'Contact admin for payment link'
                    }
                )
            
            # Mark reminder as sent
            supabase.table('payments').update({'reminder_sent': True}).eq('id', payment['id']).execute()
            
            logger.info(f"[Scheduler] ✓ Sent payment reminder for: {payment['id']}")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error sending payment reminder: {str(e)}")
    
    # ===================================================================
    # Lead Nurturing Jobs
    # ===================================================================
    
    def check_lead_follow_ups(self):
        """Check for leads needing follow-up"""
        try:
            logger.info("[Scheduler] Checking lead follow-ups...")
            
            # Get leads imported 3+ days ago without follow-up
            cutoff_date = (datetime.utcnow() - timedelta(days=3)).isoformat()
            
            response = supabase.table('imported_leads') \
                .select('*') \
                .eq('status', 'new') \
                .lte('created_at', cutoff_date) \
                .eq('follow_up_sent', False) \
                .execute()
            
            leads = response.data if response.data else []
            
            for lead in leads:
                self._send_lead_follow_up(lead)
            
            logger.info(f"[Scheduler] ✓ Processed {len(leads)} lead follow-ups")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error in lead follow-up job: {str(e)}")
    
    def _send_lead_follow_up(self, lead):
        """Send follow-up to lead"""
        try:
            name = lead.get('name', 'There')
            email = lead.get('email')
            
            if email:
                self.email_service.send_email(
                    to_email=email,
                    subject="Following up on your interest",
                    content=f"""
                    <html>
                    <body>
                        <h2>Hi {name},</h2>
                        <p>We noticed you showed interest in our courses. Would you like to learn more?</p>
                        
                        <p>Reply to this email or schedule a call with us to discuss how we can help you achieve your goals.</p>
                        
                        <p><a href="http://your-app.com/cta" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Explore Courses</a></p>
                    </body>
                    </html>
                    """
                )
            
            # Mark follow-up as sent
            supabase.table('imported_leads').update({'follow_up_sent': True}).eq('id', lead['id']).execute()
            
            logger.info(f"[Scheduler] ✓ Sent follow-up for lead: {lead['id']}")
            
        except Exception as e:
            logger.error(f"[Scheduler] ✗ Error sending lead follow-up: {str(e)}")
    
    # ===================================================================
    # Job Registration
    # ===================================================================
    
    def register_all_jobs(self):
        """Register all scheduled jobs"""
        
        # Session reminders - every 10 minutes
        self.scheduler.add_job(
            func=self.check_session_reminders_24h,
            trigger=IntervalTrigger(minutes=10),
            id='session_reminders_24h',
            name='24-hour session reminders',
            replace_existing=True
        )
        
        self.scheduler.add_job(
            func=self.check_session_reminders_15min,
            trigger=IntervalTrigger(minutes=5),
            id='session_reminders_15min',
            name='15-minute session reminders',
            replace_existing=True
        )
        
        # Recording notifications - every 30 minutes
        self.scheduler.add_job(
            func=self.check_recording_availability,
            trigger=IntervalTrigger(minutes=30),
            id='recording_notifications',
            name='Recording availability notifications',
            replace_existing=True
        )
        
        # Assignment reminders - every 6 hours
        self.scheduler.add_job(
            func=self.check_assignment_deadlines,
            trigger=CronTrigger(hour='*/6'),
            id='assignment_reminders',
            name='Assignment deadline reminders',
            replace_existing=True
        )
        
        # Payment reminders - daily at 10 AM UTC
        self.scheduler.add_job(
            func=self.check_pending_payments,
            trigger=CronTrigger(hour=10, minute=0),
            id='payment_reminders',
            name='Pending payment reminders',
            replace_existing=True
        )
        
        # Lead follow-ups - daily at 9 AM UTC
        self.scheduler.add_job(
            func=self.check_lead_follow_ups,
            trigger=CronTrigger(hour=9, minute=0),
            id='lead_follow_ups',
            name='Lead follow-up emails',
            replace_existing=True
        )
        
        logger.info("[Scheduler] ✓ All jobs registered successfully")


# Global scheduler instance
_scheduler_instance: Optional[JobScheduler] = None


def init_scheduler(app=None) -> JobScheduler:
    """
    Initialize and start the job scheduler
    
    Args:
        app: Flask app instance (optional)
    
    Returns:
        JobScheduler instance
    """
    global _scheduler_instance
    
    if _scheduler_instance is None:
        _scheduler_instance = JobScheduler()
        _scheduler_instance.register_all_jobs()
        _scheduler_instance.start()
        
        if app:
            logger.info(f"[Scheduler] Attached to Flask app: {app.name}")
    
    return _scheduler_instance


def get_scheduler() -> JobScheduler:
    """Get the global scheduler instance"""
    if _scheduler_instance is None:
        raise RuntimeError("Scheduler not initialized. Call init_scheduler() first.")
    return _scheduler_instance


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global _scheduler_instance
    if _scheduler_instance:
        _scheduler_instance.shutdown()
        _scheduler_instance = None


# CLI for manual job execution
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run scheduler jobs manually')
    parser.add_argument('job', choices=[
        'session_24h', 'session_15min', 'recordings', 
        'assignments', 'payments', 'leads', 'all'
    ], help='Job to run')
    
    args = parser.parse_args()
    
    scheduler = JobScheduler()
    
    print(f"\n{'='*60}")
    print(f"Running job: {args.job}")
    print(f"{'='*60}\n")
    
    if args.job == 'session_24h' or args.job == 'all':
        scheduler.check_session_reminders_24h()
    
    if args.job == 'session_15min' or args.job == 'all':
        scheduler.check_session_reminders_15min()
    
    if args.job == 'recordings' or args.job == 'all':
        scheduler.check_recording_availability()
    
    if args.job == 'assignments' or args.job == 'all':
        scheduler.check_assignment_deadlines()
    
    if args.job == 'payments' or args.job == 'all':
        scheduler.check_pending_payments()
    
    if args.job == 'leads' or args.job == 'all':
        scheduler.check_lead_follow_ups()
    
    print(f"\n{'='*60}")
    print("Job execution complete!")
    print(f"{'='*60}\n")
