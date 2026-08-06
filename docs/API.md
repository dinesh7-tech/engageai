# API Specifications

EngageAI exposes both server-side remote procedure functions (`createServerFn`) and public webhook endpoints.

---

## 1. Webhook Endpoints

### WhatsApp Webhook Callback
Processes real-time messages and delivery status updates from the Meta WhatsApp Cloud API.

- **URL**: `/api/webhooks/whatsapp`
- **Method**: `GET`
  - **Purpose**: Webhook verification challenge.
  - **Query Parameters**:
    - `hub.mode`: `"subscribe"`
    - `hub.challenge`: Verification random string.
    - `hub.verify_token`: Match configured verify token.
- **Method**: `POST`
  - **Purpose**: Handles inbound status updates and customer replies.
  - **Headers**:
    - `x-hub-signature-256`: HMAC-SHA256 signature calculated with `WHATSAPP_APP_SECRET`.
  - **Inbound Keywords**:
    - `LEAVE`: Instantly removes the corresponding phone number from the workspace queue.

---

## 2. Server Functions

### WhatsApp Engine
Server functions exposed securely via RPC wrappers in `src/lib/whatsapp.functions.ts`.

#### `getWhatsAppStatus`
Retrieves connection metadata and real-time messaging statistics for a workspace.
- **Parameters**: `workspaceId: string`
- **Returns**: Status details (configured state, phone numbers, total messages sent today, etc.).

#### `sendWhatsAppMessage`
Dispatches a templated template or text notification.
- **Parameters**: `SendWhatsAppInput`
  - `to`: Target phone number (international format).
  - `templateId`: Matches template from library (e.g., `queue_joined`, `feedback_request`).
  - `variables`: Key-value params mapping to the template body.
- **Returns**: Send outcome (`sent`, `simulated`, `failed`).
