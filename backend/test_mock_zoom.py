"""
Quick Test Script for Mock Zoom Service
========================================

Run this to verify mock Zoom service is working correctly.
Tests all major functionality including meeting lifecycle and recordings.
"""

import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set mock mode before importing services
os.environ['USE_MOCK_ZOOM'] = 'true'

from services.zoom_service import get_zoom_service
from services.mock_zoom_service import get_mock_zoom_service


def print_section(title):
    """Print section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_result(test_name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"     {details}")


def test_mock_zoom():
    """Run comprehensive mock Zoom tests"""
    
    print_section("Mock Zoom Service Test Suite")
    
    # Verify mock mode is enabled
    zoom = get_zoom_service()
    is_mock = isinstance(zoom, type(get_mock_zoom_service()))
    print_result("Mock Service Loaded", is_mock, 
                f"Service type: {type(zoom).__name__}")
    
    if not is_mock:
        print("\n❌ ERROR: Mock service not loaded!")
        print("Make sure USE_MOCK_ZOOM=true in .env")
        return False
    
    all_passed = True
    
    # Test 1: Create Meeting
    print_section("Test 1: Create Meeting")
    result = zoom.create_meeting(
        topic="Test Meeting - Python Integration",
        start_time=datetime.utcnow() + timedelta(hours=1),
        duration_minutes=30,
        created_by="test"
    )
    
    passed = result.get("success") and result.get("zoom_meeting_id")
    print_result("Create Meeting", passed)
    if passed:
        meeting_id = result["zoom_meeting_id"]
        print(f"     Meeting ID: {meeting_id}")
        print(f"     Join URL: {result['zoom_join_url']}")
        print(f"     Password: {result['zoom_password']}")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
        return all_passed
    
    # Test 2: Get Meeting
    print_section("Test 2: Get Meeting Details")
    result = zoom.get_meeting(meeting_id)
    
    passed = result.get("success") and result.get("meeting", {}).get("id") == meeting_id
    print_result("Get Meeting", passed)
    if passed:
        meeting = result["meeting"]
        print(f"     Status: {meeting['status']}")
        print(f"     Topic: {meeting['topic']}")
        print(f"     Duration: {meeting['duration']} minutes")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 3: Update Meeting
    print_section("Test 3: Update Meeting")
    result = zoom.update_meeting(
        meeting_id=meeting_id,
        topic="Updated: Test Meeting",
        duration_minutes=45
    )
    
    passed = result.get("success")
    print_result("Update Meeting", passed)
    if passed:
        meeting = result["meeting"]
        print(f"     New Topic: {meeting['topic']}")
        print(f"     New Duration: {meeting['duration']} minutes")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 4: List Meetings
    print_section("Test 4: List Meetings")
    result = zoom.list_meetings()
    
    passed = result.get("success") and result.get("total_records", 0) >= 1
    print_result("List Meetings", passed)
    if passed:
        print(f"     Total Meetings: {result['total_records']}")
        print(f"     Page Size: {result['page_size']}")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 5: Get Recordings (before meeting ends)
    print_section("Test 5: Get Recordings (Before Meeting Ends)")
    result = zoom.get_meeting_recordings(meeting_id)
    
    passed = result.get("success") and result.get("recording_count", -1) == 0
    print_result("No Recordings Yet", passed)
    if passed:
        print(f"     Recording Count: {result['recording_count']}")
        print(f"     Message: {result.get('message')}")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 6: Simulate Meeting End
    print_section("Test 6: Simulate Meeting End")
    mock_zoom = get_mock_zoom_service()
    result = mock_zoom.simulate_meeting_end(meeting_id)
    
    passed = result.get("success")
    print_result("Simulate Meeting End", passed)
    if passed:
        print(f"     {result.get('message')}")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 7: Get Recordings (after meeting ends)
    print_section("Test 7: Get Recordings (After Meeting Ends)")
    result = zoom.get_meeting_recordings(meeting_id)
    
    passed = result.get("success") and result.get("recording_count", 0) > 0
    print_result("Recordings Generated", passed)
    if passed:
        print(f"     Recording Count: {result['recording_count']}")
        print(f"     Total Size: {result['total_size'] / 1_000_000:.2f} MB")
        for idx, recording in enumerate(result.get("recording_files", []), 1):
            print(f"     Recording {idx}: {recording['file_type']} ({recording['file_size'] / 1_000_000:.2f} MB)")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 8: Meeting Status Update
    print_section("Test 8: Meeting Status Update")
    result = zoom.get_meeting(meeting_id)
    
    passed = result.get("success") and result.get("meeting", {}).get("status") == "ended"
    print_result("Status Updated to 'ended'", passed)
    if passed:
        meeting = result["meeting"]
        print(f"     Status: {meeting['status']}")
        print(f"     Meeting ended and recordings available")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 9: Delete Meeting
    print_section("Test 9: Delete Meeting")
    result = zoom.delete_meeting(meeting_id)
    
    passed = result.get("success")
    print_result("Delete Meeting", passed)
    if passed:
        print(f"     {result.get('message')}")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 10: Verify Deletion
    print_section("Test 10: Verify Deletion")
    result = zoom.get_meeting(meeting_id)
    
    passed = not result.get("success") and result.get("error_code") == 3001
    print_result("Meeting Not Found (Expected)", passed)
    if passed:
        print(f"     Error: {result.get('error')} (This is expected)")
    else:
        print(f"     Unexpected result: Meeting still exists")
        all_passed = False
    
    # Test 11: Test Error Handling
    print_section("Test 11: Error Handling")
    result = zoom.get_meeting("999999999")
    
    passed = not result.get("success") and result.get("error_code") == 3001
    print_result("Error Handling", passed)
    if passed:
        print(f"     Correctly returned error: {result.get('error')}")
    else:
        print(f"     Error handling failed")
        all_passed = False
    
    # Test 12: Batch Operations
    print_section("Test 12: Batch Operations")
    meeting_ids = []
    for i in range(3):
        result = zoom.create_meeting(
            topic=f"Batch Meeting {i+1}",
            start_time=datetime.utcnow() + timedelta(hours=i+1),
            duration_minutes=30,
            created_by="batch_test"
        )
        if result.get("success"):
            meeting_ids.append(result["zoom_meeting_id"])
    
    passed = len(meeting_ids) == 3
    print_result("Batch Create 3 Meetings", passed)
    if passed:
        print(f"     Created meetings: {', '.join(meeting_ids)}")
    else:
        print(f"     Only created {len(meeting_ids)} meetings")
        all_passed = False
    
    # Test 13: Clear All Meetings
    print_section("Test 13: Clear All Meetings")
    result = mock_zoom.clear_all_meetings()
    
    passed = result.get("success")
    print_result("Clear All Meetings", passed)
    if passed:
        print(f"     {result.get('message')}")
    else:
        print(f"     Error: {result.get('error')}")
        all_passed = False
    
    # Test 14: Verify Clear
    print_section("Test 14: Verify Clear")
    result = zoom.list_meetings()
    
    passed = result.get("success") and result.get("total_records") == 0
    print_result("All Meetings Cleared", passed)
    if passed:
        print(f"     Total Meetings: {result['total_records']}")
    else:
        print(f"     Error: Still have {result.get('total_records', 'unknown')} meetings")
        all_passed = False
    
    # Final Summary
    print_section("Test Summary")
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("\nMock Zoom service is working correctly.")
        print("You can now use it for development and testing.")
    else:
        print("⚠️ SOME TESTS FAILED")
        print("\nPlease review the errors above.")
        print("Make sure USE_MOCK_ZOOM=true in your .env file.")
    
    print("\n" + "="*60 + "\n")
    return all_passed


if __name__ == "__main__":
    try:
        success = test_mock_zoom()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
