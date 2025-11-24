# Mock Zoom Service - Quick Reference

## 🚀 Quick Start

### 1. Enable Mock Mode

```bash
# .env
USE_MOCK_ZOOM=true
```

### 2. Use in Code

```python
from services.zoom_service import get_zoom_service

zoom = get_zoom_service()  # Auto-detects mock mode
```

### 3. Run Test

```bash
cd backend
python test_mock_zoom.py
```

---

## 📋 Common Operations

### Create Meeting

```python
result = zoom.create_meeting(
    topic="Team Standup",
    start_time=datetime.utcnow() + timedelta(hours=1),
    duration_minutes=30,
    created_by="manual"
)
meeting_id = result["zoom_meeting_id"]
join_url = result["zoom_join_url"]
```

### Get Meeting

```python
result = zoom.get_meeting(meeting_id)
status = result["meeting"]["status"]  # waiting, started, ended
```

### Update Meeting

```python
zoom.update_meeting(
    meeting_id=meeting_id,
    topic="Updated Topic",
    duration_minutes=45
)
```

### Delete Meeting

```python
zoom.delete_meeting(meeting_id)
```

### List Meetings

```python
result = zoom.list_meetings(type="scheduled")  # or "live", "upcoming"
total = result["total_records"]
```

### Get Recordings

```python
# Only available after meeting ends
result = zoom.get_meeting_recordings(meeting_id)
recordings = result["recording_files"]
```

---

## 🧪 Testing Utilities

### Force Meeting to End

```python
from services.mock_zoom_service import get_mock_zoom_service

mock_zoom = get_mock_zoom_service()
mock_zoom.simulate_meeting_end(meeting_id)  # Instant recordings
```

### Clear All Data

```python
mock_zoom.clear_all_meetings()  # Fresh start
```

### Run Demo

```bash
python -m services.mock_zoom_service
```

---

## 📊 Mock Data

| Item         | Format         | Example                                  |
| ------------ | -------------- | ---------------------------------------- |
| Meeting ID   | 9-11 digits    | `123456789`                              |
| Password     | 6 chars        | `abc123`                                 |
| Join URL     | zoom.us/j/{id} | `https://zoom.us/j/123456789?pwd=abc123` |
| Recording ID | REC\_{16 hex}  | `REC_A1B2C3D4E5F67890`                   |

---

## 🎯 Status Flow

```
waiting (before start) → started (during) → ended (after +30min)
```

Recordings auto-generate when status changes to `ended`.

---

## ⚙️ Environment Setup

| Environment | USE_MOCK_ZOOM | Notes                      |
| ----------- | ------------- | -------------------------- |
| Development | `true`        | No Zoom credentials needed |
| Testing     | `true`        | Fast, predictable          |
| Staging     | `false`       | Test with real Zoom        |
| Production  | `false`       | Always use real API        |

---

## ✅ Verification

```bash
# Should see: "Using MOCK Zoom service"
python test_mock_zoom.py

# Expected: "🎉 ALL TESTS PASSED!"
```

---

## 🔗 Integration Points

### Manual Creation

```python
from services.session_zoom_integration import get_session_zoom_integration

integration = get_session_zoom_integration()
integration.create_meeting_for_session(session_id, source="manual")
```

### Payment Webhook

```python
integration.create_meeting_on_payment_success(student_id, payment_id)
```

### Cron Job

```python
integration.batch_create_meetings_for_pending_sessions(days_ahead=7)
```

All automatically use mock when `USE_MOCK_ZOOM=true`.

---

## 📖 Full Documentation

See `services/MOCK_ZOOM_README.md` for complete details.

---

**Status**: ✅ Ready for development and testing
