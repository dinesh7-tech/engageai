# Meta WhatsApp Cloud API Setup

EngageAI integrates directly with Meta's official WhatsApp Business Cloud API to deliver automated messages.

---

## 1. Meta Developer Portal Setup

1. **Create Meta App**: Go to [Meta for Developers](https://developers.facebook.com/) and create a Business App.
2. **Add WhatsApp Product**: Set up the WhatsApp product inside your app manager.
3. **Get API Keys**:
   - Save your **Phone Number ID** and **WhatsApp Business Account ID**.
   - Generate a temporary access token (or setup a permanent System User access token).
4. **Configure Webhook**:
   - Set the Webhook Callback URL: `https://<your-domain>/api/webhooks/whatsapp`.
   - Set the Verify Token (matching your `WHATSAPP_VERIFY_TOKEN` env config).
   - Subscribe to the `messages` fields under WhatsApp Business Account webhooks.

---

## 2. Inbound SMS Automation
When users message your WhatsApp number:
- **`LEAVE` Keyword**: The system reads incoming messages. If a user replies with the exact word `LEAVE`, the webhook immediately exits the user from any active workspace waitlist queue.
- **Delivery Auditing**: Message events write delivery metrics (`sent`, `delivered`, `read`) to `whatsapp_messages` to ensure visibility.
