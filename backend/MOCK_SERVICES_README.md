# Mock Services Implementation

This document explains the mock services implementation for external integrations that enables prototype testing without requiring actual API keys.

## Overview

The mock services simulate the following external integrations:

- **SendGrid** - Email service
- **AiSensy** - WhatsApp messaging
- **Instamojo** - Payment processing
- **Bolna.ai** - Voice calling
- **Zoom** - Video conferencing and recordings

Mock services for SendGrid, AiSensy, Instamojo, and Bolna log their actions to Supabase for visibility and testing purposes.
The Zoom mock service stores data in-memory for fast testing without database dependencies.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Enable mock mode for development/testing
MOCK_MODE=true

# Enable mock Zoom (no credentials needed)
USE_MOCK_ZOOM=true

# Supabase configuration (required for logging)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# External API keys (not required when MOCK_MODE=true)
SENDGRID_API_KEY=your_sendgrid_api_key
AISENSY_API_KEY=your_aisensy_api_key
BOLNA_API_KEY=your_bolna_api_key
INSTAMOJO_API_KEY=your_instamojo_api_key
INSTAMOJO_AUTH_TOKEN=your_instamojo_auth_token

# Zoom API keys (not required when USE_MOCK_ZOOM=true)
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
```

### How It Works

When `MOCK_MODE=true`, the Flask application automatically uses mock services instead of real external APIs:

1. **Email Service**: Logs emails to `email_logs` table instead of sending via SendGrid
2. **WhatsApp Service**: Simulates messages and logs to `whatsapp_logs` and `crm_messages` tables
3. **Payment Service**: Creates mock payment links and logs to `payments` table
4. **Voice Service**: Simulates calls and logs to `call_logs` table
5. **Zoom Service** (USE_MOCK_ZOOM=true): Stores meetings in-memory, simulates recording generation

## Mock Services Features

### Email Service (`MockEmailService`)

- **Single Email**: `send_email(to_email, subject, content)`
- **Bulk Email**: `send_bulk_emails(email_list)`
- **Statistics**: `get_email_stats()`
- **Template Validation**: `validate_email_template(template_data)`

**Response Times**: 0.3-1.3 seconds (realistic simulation)
**Success Rate**: 90% (configurable)

### WhatsApp Service (`MockWhatsAppService`)

- **Single Message**: `send_message(to_number, template_name, params)`
- **Bulk Messages**: `send_bulk_messages(contacts, template_name)`
- **Campaigns**: `create_campaign(name, contacts, template_name)`
- **Statistics**: `get_whatsapp_stats()`
- **Templates**: `get_templates()`

**Response Times**: 0.4-1.2 seconds
**Success Rate**: 95%

### Payment Service (`MockPaymentService`)

- **Payment Links**: `create_payment_link(amount, purpose, buyer_name, email, phone)`
- **Payment Status**: `get_payment_status(payment_id)`
- **Payment Completion**: `simulate_payment_completion(payment_id, success_rate)`
- **Statistics**: `get_payment_stats()`
- **Webhook Processing**: `process_webhook(webhook_data)`

**Response Times**: 0.4-1.0 seconds
**Success Rate**: 98%

### Voice Service (`MockVoiceService`)

- **Single Call**: `make_call(to_number, script_id, agent_id)`
- **Bulk Calls**: `make_bulk_calls(contacts, script_id)`
- **Campaigns**: `create_campaign(name, contacts, script_id)`
- **Call Status**: `get_call_status(call_id)`
- **Call Logs**: `get_call_logs(limit, status)`
- **Statistics**: `get_call_stats()`
- **Scripts**: `get_available_scripts()`

**Response Times**: 0.5-1.3 seconds
**Success Rate**: 90%

### Zoom Service (`MockZoomService`)

- **Meeting Management**: `create_meeting()`, `update_meeting()`, `delete_meeting()`
- **Meeting Details**: `get_meeting()`, `list_meetings()`
- **Recordings**: `get_meeting_recordings()`
- **Testing Utilities**: `simulate_meeting_end()`, `clear_all_meetings()`
- **Status Tracking**: Auto-updates meeting status (waiting → started → ended)
- **Recording Generation**: Auto-creates 3 recording types (MP4, M4A, CHAT) after meeting ends

**Storage**: In-memory (no database required)
**Response Times**: Instant (no network latency)
**Success Rate**: 100%

See `services/MOCK_ZOOM_README.md` for detailed documentation.

## Database Tables Used

The mock services log to the following Supabase tables:

- `email_logs` - All email activities
- `whatsapp_logs` - WhatsApp message logs
- `crm_messages` - Unified messaging view
- `payments` - Payment transactions
- `call_logs` - Voice call logs
- `whatsapp_campaigns` - WhatsApp campaigns
- `call_campaigns` - Voice call campaigns

## API Endpoints

All existing API endpoints work seamlessly with mock services when `MOCK_MODE=true`:

### Email Endpoints

- `POST /api/automation/trigger/email` - Send single email
- `POST /api/automation/trigger/email/batch` - Send bulk emails
- `GET /api/automation/email/stats` - Get email statistics

### WhatsApp Endpoints

- `POST /api/automation/trigger/whatsapp` - Send single message
- `POST /api/automation/trigger/whatsapp/bulk` - Send bulk messages
- `POST /api/automation/whatsapp/campaigns` - Create campaign
- `GET /api/automation/whatsapp/stats` - Get WhatsApp statistics

### Payment Endpoints

- `POST /api/admin/payment-links` - Create payment link
- `GET /api/admin/payment-links` - List payment links
- `POST /api/admin/payment-links/<id>/resend` - Resend payment link
- `GET /api/admin/payment-stats` - Get payment statistics
- `POST /api/webhooks/payment/webhook` - Process payment webhook

### Voice Endpoints

- `POST /api/automation/trigger/call` - Make single call
- `POST /api/automation/trigger/call/bulk` - Make bulk calls
- `POST /api/automation/call/campaigns` - Create voice campaign
- `GET /api/automation/call/status/<id>` - Get call status
- `GET /api/automation/call/logs` - Get call logs
- `GET /api/automation/call/stats` - Get call statistics

### Settings Endpoints

- `GET /api/admin/settings/mock-mode` - Get mock mode status
- `POST /api/admin/settings/mock-mode` - Update mock mode setting

## Admin Interface

The admin settings panel includes a "Development" tab where you can:

1. **Toggle Mock Mode**: Enable/disable mock services
2. **View Current Status**: See if mock mode is active
3. **API Key Display**: Shows placeholder values when mock mode is active

## Testing

### Running Tests

Use the provided test script to verify all mock services:

```bash
cd backend
python test_mock_services.py
```

This will test:

- All mock service functionality
- Database logging
- Response time simulation
- Success/failure scenarios

### Manual Testing

1. Set `MOCK_MODE=true` in your environment
2. Start the Flask server
3. Use the admin panel to enable mock mode
4. Test various endpoints through the UI or API calls
5. Check Supabase tables for logged activities

## Benefits

### Development Benefits

- **No API Keys Required**: Start development without external service setup
- **Cost Effective**: No charges from external services during development
- **Offline Development**: Work without internet connectivity
- **Fast Iteration**: No rate limits or external dependencies

### Testing Benefits

- **Predictable Behavior**: Consistent responses for testing
- **Failure Simulation**: Test error handling scenarios
- **Data Visibility**: All activities logged for inspection
- **Performance Testing**: Realistic response time simulation

### Production Benefits

- **Easy Switching**: Toggle between mock and real services
- **Fallback Option**: Use mock services as backup during outages
- **Demo Ready**: Perfect for product demonstrations

## Limitations

1. **No Real Delivery**: Emails/WhatsApp messages are not actually sent
2. **Mock Payment Links**: Payment URLs are not real and cannot process actual payments
3. **Simulated Calls**: Voice calls are simulated and no real calls are made
4. **Database Dependency**: Requires Supabase connection for logging

## Best Practices

1. **Development**: Keep `MOCK_MODE=true` during initial development
2. **Testing**: Use mock services for unit and integration tests
3. **Staging**: Consider using mock services for staging environments
4. **Production**: Always set `MOCK_MODE=false` in production
5. **Monitoring**: Monitor Supabase tables to verify mock service activities

## Troubleshooting

### Common Issues

1. **Mock Mode Not Working**

   - Ensure `MOCK_MODE=true` is set in environment
   - Restart the Flask server after changing the setting
   - Check the server logs for "[MOCK MODE]" messages

2. **Database Logging Issues**

   - Verify Supabase credentials are correct
   - Check if required tables exist in Supabase
   - Ensure proper database permissions

3. **Response Time Issues**
   - Mock services include realistic delays
   - Check network connectivity to Supabase
   - Monitor server performance

### Debug Mode

Enable debug logging by setting:

```bash
FLASK_ENV=development
FLASK_DEBUG=1
```

This will show detailed logs including mock service activities.

## Future Enhancements

Potential improvements to the mock services:

1. **Configurable Success Rates**: Allow setting custom success/failure rates
2. **Response Time Controls**: Configurable delay ranges
3. **Mock Data Templates**: Pre-defined mock data sets
4. **Webhook Simulation**: Automated webhook generation
5. **Advanced Scenarios**: Complex business logic simulation
