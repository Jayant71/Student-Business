# Mock Zoom Service - Development Guide

## Overview

The Mock Zoom service simulates Zoom API behavior for local development and testing without requiring real Zoom credentials or making actual API calls.

---

## Features

### ✅ Complete API Simulation

- Full CRUD operations (Create, Read, Update, Delete)
- Realistic meeting IDs and URLs
- Auto-generated passwords
- Meeting status transitions (waiting → started → ended)
- Recording generation after meetings "end"

### ✅ In-Memory Storage

- All meetings stored in memory
- Data cleared on service restart
- No database dependencies for mock data

### ✅ Smart Status Updates

- Auto-updates meeting status based on scheduled time
- `waiting` - Before start time
- `started` - During meeting window
- `ended` - After meeting + 30 min buffer

### ✅ Recording Simulation

- Auto-generates 3 recording types:
  - MP4 video (50-500 MB)
  - M4A audio (5-20 MB)
  - Chat transcript (1-50 KB)
- Recordings available 2 hours after meeting ends
- Realistic download/play URLs

---

## Setup

### 1. Enable Mock Mode

Add to `.env`:

```bash
USE_MOCK_ZOOM=true
```

### 2. Service Auto-Detection

All Zoom services automatically use mock when enabled:

```python
from services.zoom_service import get_zoom_service

# Returns MockZoomService if USE_MOCK_ZOOM=true
zoom = get_zoom_service()
```

### 3. No Credentials Required

When mock mode is enabled, these are **not** required:

- ❌ ZOOM_ACCOUNT_ID
- ❌ ZOOM_CLIENT_ID
- ❌ ZOOM_CLIENT_SECRET

---

## Usage Examples

### Create Meeting (Manual)

```python
from services.zoom_service import get_zoom_service
from datetime import datetime, timedelta

zoom = get_zoom_service()

result = zoom.create_meeting(
    topic="Product Demo",
    start_time=datetime.utcnow() + timedelta(hours=2),
    duration_minutes=60,
    created_by="manual"
)

print(result)
# {
#     "success": True,
#     "zoom_meeting_id": "123456789",
#     "zoom_join_url": "https://zoom.us/j/123456789?pwd=abc123",
#     "zoom_password": "abc123",
#     "meeting": {...}
# }
```

### Create Meeting (Automated - Payment Webhook)

```python
from services.session_zoom_integration import get_session_zoom_integration

integration = get_session_zoom_integration()

# Mock service will be used automatically if enabled
result = integration.create_meeting_on_payment_success(
    student_id="student-uuid",
    payment_id="PAY_12345"
)
```

### Get Meeting Details

```python
zoom = get_zoom_service()

result = zoom.get_meeting("123456789")

print(result["meeting"]["status"])  # waiting, started, or ended
```

### Update Meeting

```python
zoom = get_zoom_service()

result = zoom.update_meeting(
    meeting_id="123456789",
    topic="Updated: Product Demo",
    duration_minutes=90
)
```

### Delete Meeting

```python
zoom = get_zoom_service()

result = zoom.delete_meeting("123456789")
# {"success": True, "message": "Meeting deleted"}
```

### List All Meetings

```python
zoom = get_zoom_service()

result = zoom.list_meetings(type="scheduled")
# Returns all meetings in memory

result = zoom.list_meetings(type="live")
# Returns only started meetings

result = zoom.list_meetings(type="upcoming")
# Returns only waiting meetings
```

### Get Meeting Recordings

```python
zoom = get_zoom_service()

# Recordings only available after meeting ends
result = zoom.get_meeting_recordings("123456789")

if result["success"]:
    for recording in result["recording_files"]:
        print(f"{recording['file_type']}: {recording['download_url']}")
# MP4: https://zoom.us/rec/download/mock_123456789_video.mp4
# M4A: https://zoom.us/rec/download/mock_123456789_audio.m4a
# CHAT: https://zoom.us/rec/download/mock_123456789_chat.txt
```

---

## Testing Utilities

### Simulate Meeting End

Force a meeting to end immediately (useful for testing recordings):

```python
from services.mock_zoom_service import get_mock_zoom_service

zoom = get_mock_zoom_service()

# Force meeting to end and generate recordings
result = zoom.simulate_meeting_end("123456789")
# {"success": True, "message": "Meeting ended and recordings generated"}

# Now recordings are available
recordings = zoom.get_meeting_recordings("123456789")
print(f"Generated {recordings['recording_count']} recordings")
```

### Clear All Meetings

```python
zoom = get_mock_zoom_service()

zoom.clear_all_meetings()
# Removes all meetings from memory
```

### Run Demo Script

```bash
cd backend
python -m services.mock_zoom_service
```

Output:

```
============================================================
Mock Zoom Service Demo
============================================================

1. Creating meeting...
   [Mock Zoom] ✓ Created meeting: 123456789 - 'Mock Team Standup'
   Meeting ID: 123456789

2. Getting meeting details...
   [Mock Zoom] ✓ Retrieved meeting: 123456789 (status: waiting)
   Status: waiting

3. Updating meeting...
   [Mock Zoom] ✓ Updated meeting: 123456789
   ✓ Updated

4. Listing all meetings...
   [Mock Zoom] ✓ Listed 1 meeting(s) (type: scheduled)
   Total meetings: 1

5. Simulating meeting end...
   [Mock Zoom] ✓ Simulated meeting end: 123456789
   [Mock Zoom]   Generated 3 recording(s)

6. Getting recordings...
   [Mock Zoom] ✓ Retrieved 3 recording(s) for meeting 123456789
   Recordings: 3

7. Deleting meeting...
   [Mock Zoom] ✓ Deleted meeting: 123456789
   ✓ Deleted

============================================================
Demo complete!
============================================================
```

---

## Mock Data Characteristics

### Meeting IDs

- Format: 9-11 digit numeric string
- Example: `123456789`, `98765432101`
- Generated randomly on each creation

### Join URLs

- Format: `https://zoom.us/j/{meeting_id}?pwd={password}`
- Example: `https://zoom.us/j/123456789?pwd=abc123`
- Password embedded in URL

### Start URLs (Host)

- Format: `https://zoom.us/s/{meeting_id}?zak={token}`
- Example: `https://zoom.us/s/123456789?zak=abcd1234...`
- 32-character random token

### Passwords

- Format: 6-character alphanumeric
- Example: `abc123`, `XyZ789`
- Auto-generated unless specified

### Recording IDs

- Format: `REC_{16_hex_chars}`
- Example: `REC_A1B2C3D4E5F67890`
- Unique per recording file

### Recording URLs

- Download: `https://zoom.us/rec/download/mock_{meeting_id}_{type}.{ext}`
- Play: `https://zoom.us/rec/play/mock_{meeting_id}_{type}`

### File Sizes

- MP4 Video: 50-500 MB (random)
- M4A Audio: 5-20 MB (random)
- Chat File: 1-50 KB (random)

---

## Integration Testing

### Test Full Workflow

```python
from services.session_zoom_integration import get_session_zoom_integration
from datetime import datetime, timedelta

# Enable mock mode in .env first

integration = get_session_zoom_integration()

# 1. Create meeting for session
result = integration.create_meeting_for_session(
    session_id="test-session-uuid",
    source="manual"
)
meeting_id = result["zoom_meeting_id"]

# 2. Verify meeting created
from services.zoom_service import get_zoom_service
zoom = get_zoom_service()

meeting = zoom.get_meeting(meeting_id)
assert meeting["success"] == True
assert meeting["meeting"]["status"] == "waiting"

# 3. Simulate meeting end
from services.mock_zoom_service import get_mock_zoom_service
mock_zoom = get_mock_zoom_service()
mock_zoom.simulate_meeting_end(meeting_id)

# 4. Check recordings
recordings = zoom.get_meeting_recordings(meeting_id)
assert recordings["recording_count"] == 3
assert recordings["recording_files"][0]["file_type"] == "MP4"

print("✅ Full workflow test passed!")
```

### Test Batch Creation (Cron)

```python
integration = get_session_zoom_integration()

# Create meetings for next 7 days
result = integration.batch_create_meetings_for_pending_sessions(
    days_ahead=7,
    source="cron"
)

print(f"Created: {result['results']['created']}")
print(f"Failed: {result['results']['failed']}")
```

### Test Payment Webhook

```python
result = integration.create_meeting_on_payment_success(
    student_id="student-123",
    payment_id="PAY_98765"
)

print(f"Meetings created: {result['results']['total']}")
```

---

## Logging

Mock service provides detailed console output:

### Creation

```
[Mock Zoom] ✓ Created meeting: 123456789 - 'Team Meeting' (created_by: manual)
[Mock Zoom]   Join URL: https://zoom.us/j/123456789?pwd=abc123
[Mock Zoom]   Password: abc123
[Mock Zoom]   Start Time: 2025-11-24T15:00:00Z
```

### Retrieval

```
[Mock Zoom] ✓ Retrieved meeting: 123456789 (status: waiting)
```

### Update

```
[Mock Zoom] ✓ Updated meeting: 123456789
```

### Delete

```
[Mock Zoom] ✓ Deleted meeting: 123456789
```

### Recordings

```
[Mock Zoom] Generated 3 recording(s) for meeting 123456789
[Mock Zoom] ✓ Retrieved 3 recording(s) for meeting 123456789
```

### Warnings

```
[Mock Zoom] ⏳ No recordings yet for meeting 123456789 (status: started)
```

---

## Status Transitions

### Automatic Status Updates

Status changes based on meeting time:

```python
# Before start_time
meeting.status = "waiting"

# Between start_time and (start_time + duration + 30min)
meeting.status = "started"

# After (start_time + duration + 30min)
meeting.status = "ended"
```

### Timeline Example

Meeting scheduled at **10:00 AM** for **60 minutes**:

- **9:45 AM** → `waiting`
- **10:00 AM** → `started` (meeting begins)
- **11:00 AM** → `started` (meeting ends but 30min buffer)
- **11:30 AM** → `ended` (buffer expires)
- **11:30 AM** → Recordings generated

---

## Recording Generation

### Trigger Conditions

Recordings are auto-generated when:

1. Meeting status changes to `ended`
2. Meeting hasn't already generated recordings
3. Called via `get_meeting_recordings()` or `simulate_meeting_end()`

### Recording Types Generated

| Type  | File Type | Size Range | Recording Type                  |
| ----- | --------- | ---------- | ------------------------------- |
| Video | MP4       | 50-500 MB  | shared_screen_with_speaker_view |
| Audio | M4A       | 5-20 MB    | audio_only                      |
| Chat  | CHAT      | 1-50 KB    | chat_file                       |

### Recording Metadata

```python
{
    "recording_id": "REC_A1B2C3D4E5F67890",
    "meeting_id": "123456789",
    "recording_start": "2025-11-24T10:00:00Z",
    "recording_end": "2025-11-24T11:00:00Z",
    "file_type": "MP4",
    "file_size": 245000000,  # bytes
    "download_url": "https://zoom.us/rec/download/mock_123456789_video.mp4",
    "play_url": "https://zoom.us/rec/play/mock_123456789_video",
    "recording_type": "shared_screen_with_speaker_view",
    "status": "completed"
}
```

---

## Error Simulation

### Meeting Not Found

```python
result = zoom.get_meeting("999999999")
# {
#     "success": False,
#     "error": "Meeting 999999999 not found",
#     "error_code": 3001
# }
```

### No Recordings Yet

```python
# Meeting still in 'waiting' or 'started' status
result = zoom.get_meeting_recordings("123456789")
# {
#     "success": True,
#     "recordings": [],
#     "total_records": 0,
#     "message": "Meeting has not ended yet"
# }
```

---

## Environment Configuration

### Development (.env)

```bash
# Enable mock Zoom (no credentials needed)
USE_MOCK_ZOOM=true
```

### Staging (.env)

```bash
# Use real Zoom API
USE_MOCK_ZOOM=false
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

### Production (.env)

```bash
# Always use real Zoom API
USE_MOCK_ZOOM=false
ZOOM_ACCOUNT_ID=prod_account_id
ZOOM_CLIENT_ID=prod_client_id
ZOOM_CLIENT_SECRET=prod_client_secret
```

---

## Benefits

### For Developers

✅ No Zoom account needed for local development  
✅ No API rate limits or costs  
✅ Instant meeting creation/deletion  
✅ Predictable test data  
✅ Force meeting states for testing

### For Testing

✅ Isolated test environment  
✅ Repeatable test scenarios  
✅ Fast test execution  
✅ No external dependencies  
✅ Easy CI/CD integration

### For CI/CD

✅ No secrets required in CI  
✅ Tests run offline  
✅ Zero API costs  
✅ Parallel test execution safe  
✅ Fast pipeline execution

---

## Limitations

### What's NOT Simulated

- Real Zoom authentication flow
- Actual video/audio streaming
- Participant management
- Breakout rooms
- Polling/Q&A
- Live transcription
- Webhooks from Zoom
- Real recording file downloads

### What's IN-MEMORY

- All meeting data (lost on restart)
- Recording metadata (URLs are mock)
- Meeting status (manually triggered)

### When to Use Real Zoom

- Testing actual video quality
- Testing real participant experience
- Production deployments
- User acceptance testing
- Integration testing with real Zoom webhooks

---

## Troubleshooting

### Mock Not Being Used

**Issue**: Real Zoom API still being called

**Solution**:

```bash
# Check .env
USE_MOCK_ZOOM=true  # Must be lowercase 'true'

# Restart Flask server
python app.py
```

### Recordings Not Appearing

**Issue**: `get_meeting_recordings()` returns empty

**Solution**:

```python
# Option 1: Wait for meeting to "end" naturally
# (meeting start_time + duration + 30min must pass)

# Option 2: Force meeting end
from services.mock_zoom_service import get_mock_zoom_service
zoom = get_mock_zoom_service()
zoom.simulate_meeting_end("meeting_id")
```

### Meeting Not Found

**Issue**: Meeting ID not found in mock service

**Solution**:

```python
# Check meeting was created with mock service
# Data is in-memory only - cleared on restart

# List all meetings
result = zoom.list_meetings()
print(f"Total meetings: {result['total_records']}")
```

---

## Best Practices

### 1. Use Mock in Development

```python
# .env.development
USE_MOCK_ZOOM=true
```

### 2. Use Real in Production

```python
# .env.production
USE_MOCK_ZOOM=false
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
```

### 3. Test Both Modes

```python
# Test with mock
USE_MOCK_ZOOM=true pytest tests/

# Test with real API (in staging)
USE_MOCK_ZOOM=false pytest tests/ --staging
```

### 4. Force Meeting States

```python
# Speed up testing
mock_zoom.simulate_meeting_end(meeting_id)
# No need to wait for real meeting duration
```

### 5. Clear Data Between Tests

```python
# pytest fixture
@pytest.fixture(autouse=True)
def clear_mock_zoom():
    if Config.USE_MOCK_ZOOM:
        from services.mock_zoom_service import get_mock_zoom_service
        zoom = get_mock_zoom_service()
        zoom.clear_all_meetings()
    yield
```

---

## API Compatibility

Mock service matches real Zoom API responses:

### ✅ Matching Response Structure

- Same JSON keys
- Same data types
- Same error format
- Same status codes

### ✅ Matching Behavior

- Meeting lifecycle (waiting → started → ended)
- Recording availability timing
- Error conditions
- Pagination

### ⚠️ Simplified Behavior

- No actual OAuth flow
- No real video processing
- Instant API responses
- In-memory storage only

---

## Summary

| Feature     | Mock          | Real               |
| ----------- | ------------- | ------------------ |
| API Calls   | ❌ None       | ✅ Yes             |
| Credentials | ❌ Not needed | ✅ Required        |
| Cost        | 🆓 Free       | 💰 Zoom plan       |
| Speed       | ⚡ Instant    | 🐢 Network latency |
| Recordings  | 🎭 Simulated  | 📹 Real files      |
| Storage     | 💾 Memory     | ☁️ Zoom cloud      |
| Testing     | ✅ Perfect    | ⚠️ Limited         |
| Production  | ❌ Never      | ✅ Always          |

---

**Status**: ✅ Ready for development and testing

**Usage**: Set `USE_MOCK_ZOOM=true` in `.env` and start coding!
