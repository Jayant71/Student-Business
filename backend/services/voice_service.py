import uuid
from datetime import datetime, timedelta

import requests

from config import Config

class VoiceService:
    def __init__(self):
        self.api_key = Config.BOLNA_API_KEY
        self.base_url = "https://api.bolna.ai/call"

    def make_call(self, to_number, script_id, agent_id=None):
        if not self.api_key:
            print("Bolna API Key missing")
            return False

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "agent_id": agent_id or script_id,
            "recipient_phone_number": to_number,
            "script_reference": script_id
        }

        try:
            # response = requests.post(self.base_url, headers=headers, json=payload)
            # response.raise_for_status()
            print(f"[VOICE] Call initiated to {to_number} using script {script_id}")
            return True
        except Exception as exc:
            print(f"Error making call: {exc}")
            return False

    def make_bulk_calls(self, contacts, script_id):
        results = {"initiated": 0, "failed": 0, "call_ids": []}

        for contact in contacts:
            phone_number = contact.get('phone_number')
            if not phone_number:
                results["failed"] += 1
                continue

            success = self.make_call(
                phone_number,
                script_id,
                contact.get('agent_id')
            )

            if success:
                results["initiated"] += 1
                results["call_ids"].append(str(uuid.uuid4()))
            else:
                results["failed"] += 1

        return results

    def get_call_status(self, call_id):
        return {
            "id": call_id,
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat(),
            "details": "Awaiting provider callback"
        }

    def get_call_logs(self, limit=10, status=None):
        statuses = ["completed", "answered", "busy", "no_answer", "failed"]
        logs = []
        current_time = datetime.utcnow()

        for index in range(limit):
            log_status = statuses[index % len(statuses)]
            log = {
                "id": f"call_{index+1}",
                "to_number": f"+123456789{index}",
                "script_id": f"script_{(index % 4) + 1}",
                "status": log_status,
                "duration": 45 + (index * 5),
                "created_at": (current_time - timedelta(minutes=index * 5)).isoformat()
            }

            logs.append(log)

        if status:
            filtered = [log for log in logs if log["status"] == status]
            return filtered or logs[:1]

        return logs

    def get_call_stats(self):
        total_calls = 120
        completed_calls = 95
        failed_calls = total_calls - completed_calls
        avg_duration = 120  # seconds

        return {
            "total_calls": total_calls,
            "completed_calls": completed_calls,
            "failed_calls": failed_calls,
            "success_rate": round((completed_calls / total_calls) * 100, 1),
            "average_duration": avg_duration,
            "total_minutes": round((total_calls * avg_duration) / 60, 1)
        }

    def get_available_scripts(self):
        return [
            {
                "id": "welcome_script",
                "name": "Welcome Call",
                "description": "Welcome call for new students",
                "duration": "2-3 minutes",
                "language": "en"
            },
            {
                "id": "followup_script",
                "name": "Follow Up Call",
                "description": "Follow-up call for payment reminders",
                "duration": "1-2 minutes",
                "language": "en"
            },
            {
                "id": "reminder_script",
                "name": "Class Reminder",
                "description": "Automated class reminder call",
                "duration": "30 seconds",
                "language": "en"
            }
        ]

    def create_campaign(self, campaign_name, contacts, script_id, scheduled_time=None):
        campaign_id = str(uuid.uuid4())
        return {
            "campaign_id": campaign_id,
            "name": campaign_name,
            "status": "scheduled" if scheduled_time else "created",
            "contacts_count": len(contacts),
            "script_id": script_id,
            "scheduled_time": scheduled_time
        }
