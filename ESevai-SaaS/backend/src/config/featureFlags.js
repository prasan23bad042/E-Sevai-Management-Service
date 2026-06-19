/**
 * Feature Flags Configuration
 * Control rollout of advanced SaaS features in staged deployment phases.
 */
const featureFlags = {
    whatsapp_integration: false,
    online_payments_gateway: false,
    customer_self_portal: false,
    sms_notifications_channel: false,
    email_notifications_channel: true,
    supabase_realtime_socket: false
};

module.exports = featureFlags;
