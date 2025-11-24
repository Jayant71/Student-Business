"""
Lead Import Automation Workflows
=================================

Handles automated email sequences for imported leads:
- Initial CTA email after import
- Follow-up emails on Day 3 and Day 7
- Conversion tracking
- Campaign management

Usage:
------
from workflows.lead_automation import trigger_lead_campaign, send_cta_emails

# After CSV import
trigger_lead_campaign(import_batch_id, lead_ids)

# Manual CTA email blast
send_cta_emails(lead_emails)
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_client import supabase
from services.email_service import get_email_service

logger = logging.getLogger(__name__)


class LeadAutomation:
    """Manages lead nurturing automation workflows"""
    
    def __init__(self):
        self.email_service = get_email_service()
    
    def trigger_lead_campaign(self, import_batch_id: str, lead_ids: List[str]) -> Dict:
        """
        Trigger automated email campaign for imported leads
        
        Args:
            import_batch_id: ID of the import batch
            lead_ids: List of lead IDs to include in campaign
        
        Returns:
            Dict with campaign results
        """
        try:
            logger.info(f"[Lead Automation] Starting campaign for batch: {import_batch_id}")
            
            # Get leads
            response = supabase.table('imported_leads') \
                .select('*') \
                .in_('id', lead_ids) \
                .execute()
            
            leads = response.data if response.data else []
            
            if not leads:
                return {"success": False, "error": "No leads found"}
            
            # Create campaign record
            campaign = supabase.table('lead_campaigns').insert({
                'import_batch_id': import_batch_id,
                'total_leads': len(leads),
                'status': 'active',
                'created_at': datetime.utcnow().isoformat()
            }).execute()
            
            campaign_id = campaign.data[0]['id']
            
            # Send initial CTA emails (Day 0)
            initial_results = self.send_initial_cta_emails(leads, campaign_id)
            
            # Schedule follow-ups
            self._schedule_follow_ups(campaign_id, lead_ids)
            
            logger.info(f"[Lead Automation] ✓ Campaign {campaign_id} started with {len(leads)} leads")
            
            return {
                "success": True,
                "campaign_id": campaign_id,
                "leads_emailed": initial_results['sent'],
                "leads_failed": initial_results['failed']
            }
            
        except Exception as e:
            logger.error(f"[Lead Automation] ✗ Error triggering campaign: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def send_initial_cta_emails(self, leads: List[Dict], campaign_id: str) -> Dict:
        """Send initial CTA emails to leads"""
        sent = 0
        failed = 0
        
        for lead in leads:
            try:
                name = lead.get('name', 'There')
                email = lead.get('email')
                
                if not email:
                    failed += 1
                    continue
                
                # Send CTA email
                result = self.email_service.send_email(
                    to_email=email,
                    subject="Transform Your Business Skills with Our Courses",
                    content=self._format_cta_email(name, lead.get('course_interest'))
                )
                
                if result.get('success'):
                    sent += 1
                    
                    # Update lead status
                    supabase.table('imported_leads').update({
                        'status': 'contacted',
                        'campaign_id': campaign_id,
                        'last_contacted_at': datetime.utcnow().isoformat()
                    }).eq('id', lead['id']).execute()
                else:
                    failed += 1
                    
            except Exception as e:
                logger.error(f"[Lead Automation] Error sending email to {lead.get('email')}: {str(e)}")
                failed += 1
        
        return {"sent": sent, "failed": failed}
    
    def send_follow_up_emails(self, campaign_id: str, day: int) -> Dict:
        """
        Send follow-up emails for a campaign
        
        Args:
            campaign_id: Campaign ID
            day: Day number (3 or 7)
        
        Returns:
            Dict with results
        """
        try:
            logger.info(f"[Lead Automation] Sending Day {day} follow-up for campaign: {campaign_id}")
            
            # Get leads from campaign who haven't responded
            response = supabase.table('imported_leads') \
                .select('*') \
                .eq('campaign_id', campaign_id) \
                .eq('status', 'contacted') \
                .execute()
            
            leads = response.data if response.data else []
            
            sent = 0
            failed = 0
            
            for lead in leads:
                try:
                    name = lead.get('name', 'There')
                    email = lead.get('email')
                    
                    if not email:
                        failed += 1
                        continue
                    
                    # Send follow-up email
                    result = self.email_service.send_email(
                        to_email=email,
                        subject=self._get_follow_up_subject(day),
                        content=self._format_follow_up_email(name, day)
                    )
                    
                    if result.get('success'):
                        sent += 1
                        
                        # Update last contacted
                        supabase.table('imported_leads').update({
                            'last_contacted_at': datetime.utcnow().isoformat(),
                            f'follow_up_day{day}_sent': True
                        }).eq('id', lead['id']).execute()
                    else:
                        failed += 1
                        
                except Exception as e:
                    logger.error(f"[Lead Automation] Error sending follow-up to {lead.get('email')}: {str(e)}")
                    failed += 1
            
            logger.info(f"[Lead Automation] ✓ Day {day} follow-up sent: {sent} success, {failed} failed")
            
            return {"success": True, "sent": sent, "failed": failed}
            
        except Exception as e:
            logger.error(f"[Lead Automation] ✗ Error sending follow-ups: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def track_conversion(self, lead_email: str, cta_submission_id: str) -> bool:
        """
        Track when a lead converts to CTA submission
        
        Args:
            lead_email: Email of the lead
            cta_submission_id: ID of the CTA submission
        
        Returns:
            True if tracked successfully
        """
        try:
            # Find lead by email
            response = supabase.table('imported_leads') \
                .select('*') \
                .eq('email', lead_email) \
                .execute()
            
            if response.data:
                lead = response.data[0]
                
                # Update lead with conversion
                supabase.table('imported_leads').update({
                    'status': 'converted',
                    'cta_submission_id': cta_submission_id,
                    'converted_at': datetime.utcnow().isoformat()
                }).eq('id', lead['id']).execute()
                
                # Update campaign stats
                if lead.get('campaign_id'):
                    supabase.rpc('increment_campaign_conversions', {
                        'campaign_id': lead['campaign_id']
                    }).execute()
                
                logger.info(f"[Lead Automation] ✓ Tracked conversion for lead: {lead_email}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"[Lead Automation] ✗ Error tracking conversion: {str(e)}")
            return False
    
    def get_campaign_stats(self, campaign_id: str) -> Optional[Dict]:
        """Get statistics for a campaign"""
        try:
            # Get campaign
            campaign_response = supabase.table('lead_campaigns') \
                .select('*') \
                .eq('id', campaign_id) \
                .single() \
                .execute()
            
            if not campaign_response.data:
                return None
            
            campaign = campaign_response.data
            
            # Get lead statistics
            leads_response = supabase.table('imported_leads') \
                .select('status') \
                .eq('campaign_id', campaign_id) \
                .execute()
            
            leads = leads_response.data if leads_response.data else []
            
            stats = {
                'total_leads': campaign.get('total_leads', 0),
                'contacted': sum(1 for l in leads if l['status'] == 'contacted'),
                'converted': sum(1 for l in leads if l['status'] == 'converted'),
                'bounced': sum(1 for l in leads if l['status'] == 'bounced'),
                'conversion_rate': 0
            }
            
            if stats['total_leads'] > 0:
                stats['conversion_rate'] = round((stats['converted'] / stats['total_leads']) * 100, 2)
            
            return stats
            
        except Exception as e:
            logger.error(f"[Lead Automation] ✗ Error getting campaign stats: {str(e)}")
            return None
    
    def _schedule_follow_ups(self, campaign_id: str, lead_ids: List[str]):
        """Schedule follow-up emails for Day 3 and Day 7"""
        # Note: Actual scheduling done by APScheduler background job
        # This just marks leads as eligible for follow-ups
        logger.info(f"[Lead Automation] Follow-ups scheduled for campaign: {campaign_id}")
    
    def _get_follow_up_subject(self, day: int) -> str:
        """Get email subject for follow-up day"""
        if day == 3:
            return "Still interested in upskilling?"
        elif day == 7:
            return "Last chance: Special offer inside!"
        return "Follow-up from our team"
    
    def _format_cta_email(self, name: str, course_interest: Optional[str] = None) -> str:
        """Format initial CTA email"""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #3b82f6;">Transform Your Business Skills</h1>
                
                <p>Hi {name},</p>
                
                <p>Thank you for your interest in our courses! We're excited to help you develop the skills you need to succeed in today's competitive business environment.</p>
                
                {f'<p>We noticed you\'re interested in <strong>{course_interest}</strong>. We have comprehensive programs designed just for that!</p>' if course_interest else ''}
                
                <h3 style="color: #10b981;">What We Offer:</h3>
                <ul>
                    <li>📚 Industry-expert instructors</li>
                    <li>🎥 Live interactive sessions</li>
                    <li>📝 Hands-on assignments and projects</li>
                    <li>🎓 Recognized certification upon completion</li>
                    <li>💼 Career support and guidance</li>
                </ul>
                
                <p>Ready to take the next step?</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://your-app.com/cta" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Apply Now</a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 40px;">
                    Have questions? Reply to this email or call us at +91-XXXXXXXXXX
                </p>
                
                <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px;">
                    You're receiving this email because you expressed interest in our courses. If you no longer wish to receive these emails, you can <a href="#">unsubscribe</a>.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _format_follow_up_email(self, name: str, day: int) -> str:
        """Format follow-up email"""
        if day == 3:
            return f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3b82f6;">Still Thinking About It?</h2>
                    
                    <p>Hi {name},</p>
                    
                    <p>We noticed you haven't applied yet. We wanted to reach out and see if you have any questions about our courses.</p>
                    
                    <h3 style="color: #10b981;">Why Students Love Our Programs:</h3>
                    <ul>
                        <li>🌟 95% satisfaction rate</li>
                        <li>💪 Practical, real-world skills</li>
                        <li>🤝 Supportive learning community</li>
                        <li>📈 Career growth opportunities</li>
                    </ul>
                    
                    <p>Don't miss out on this opportunity to invest in yourself!</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://your-app.com/cta" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Apply Today</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Need help deciding? Schedule a free consultation with our team.
                    </p>
                </div>
            </body>
            </html>
            """
        else:  # day == 7
            return f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #f59e0b;">Last Chance - Special Offer!</h2>
                    
                    <p>Hi {name},</p>
                    
                    <p>This is our final reminder about your application. We don't want you to miss out on this opportunity!</p>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color: #f59e0b; margin-top: 0;">🎁 Limited Time Offer</h3>
                        <p style="margin-bottom: 0;">Apply within the next 48 hours and get:</p>
                        <ul style="margin-top: 10px;">
                            <li>10% discount on course fees</li>
                            <li>Free access to premium resources</li>
                            <li>Priority enrollment for upcoming batches</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://your-app.com/cta" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Claim Your Offer Now</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 40px;">
                        This is the last email you'll receive from us about this opportunity. We hope to see your application soon!
                    </p>
                </div>
            </body>
            </html>
            """


# Global instance
_lead_automation: Optional[LeadAutomation] = None


def get_lead_automation() -> LeadAutomation:
    """Get singleton lead automation instance"""
    global _lead_automation
    if _lead_automation is None:
        _lead_automation = LeadAutomation()
    return _lead_automation


# Convenience functions
def trigger_lead_campaign(import_batch_id: str, lead_ids: List[str]) -> Dict:
    """Trigger lead campaign (convenience function)"""
    return get_lead_automation().trigger_lead_campaign(import_batch_id, lead_ids)


def send_follow_up_emails(campaign_id: str, day: int) -> Dict:
    """Send follow-up emails (convenience function)"""
    return get_lead_automation().send_follow_up_emails(campaign_id, day)


def track_lead_conversion(lead_email: str, cta_submission_id: str) -> bool:
    """Track lead conversion (convenience function)"""
    return get_lead_automation().track_conversion(lead_email, cta_submission_id)


# CLI for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Test lead automation workflows')
    parser.add_argument('action', choices=['campaign', 'followup', 'stats'], help='Action to perform')
    parser.add_argument('--campaign-id', help='Campaign ID')
    parser.add_argument('--day', type=int, choices=[3, 7], help='Follow-up day')
    parser.add_argument('--batch-id', help='Import batch ID')
    parser.add_argument('--leads', nargs='+', help='Lead IDs')
    
    args = parser.parse_args()
    
    automation = get_lead_automation()
    
    if args.action == 'campaign' and args.batch_id and args.leads:
        print(f"\nStarting campaign for batch: {args.batch_id}")
        result = automation.trigger_lead_campaign(args.batch_id, args.leads)
        print(f"Result: {result}\n")
    
    elif args.action == 'followup' and args.campaign_id and args.day:
        print(f"\nSending Day {args.day} follow-up for campaign: {args.campaign_id}")
        result = automation.send_follow_up_emails(args.campaign_id, args.day)
        print(f"Result: {result}\n")
    
    elif args.action == 'stats' and args.campaign_id:
        print(f"\nGetting stats for campaign: {args.campaign_id}")
        stats = automation.get_campaign_stats(args.campaign_id)
        print(f"Stats: {stats}\n")
    
    else:
        parser.print_help()
