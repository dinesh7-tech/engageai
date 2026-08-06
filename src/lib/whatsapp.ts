import { createHmac } from "crypto";

interface MetaMessagePayload {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text" | "template" | "image" | "document";
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  image?: { link: string; caption?: string };
  document?: { link: string };
}

// Fetch configs helper (returns workspace config or env values)
export async function getWhatsAppConfig(workspaceId: string, supabaseClient: any) {
  const { data } = await supabaseClient
    .from("whatsapp_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const token = data?.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = data?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const businessId = data?.business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const verifyToken = data?.verify_token || process.env.WHATSAPP_VERIFY_TOKEN;
  const phoneNumber = data?.phone_number || process.env.WHATSAPP_FROM_NUMBER || "+14155238886";

  return {
    configured: Boolean(token && phoneId),
    token,
    phoneId,
    businessId,
    verifyToken,
    phoneNumber,
  };
}

// Helper executing API calls with retries
async function callMetaAPI(
  phoneId: string,
  token: string,
  payload: MetaMessagePayload,
  retries = 3
): Promise<any> {
  const url = `https://graph.facebook.com/v23.0/${phoneId}/messages`;
  let attempt = 0;

  while (attempt < retries) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || `API error ${res.status}`);
      }
      return body;
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

export async function sendTextMessage(to: string, message: string, phoneId: string, token: string) {
  return callMetaAPI(phoneId, token, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: message },
  });
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: any[],
  phoneId: string,
  token: string
) {
  return callMetaAPI(phoneId, token, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption: string,
  phoneId: string,
  token: string
) {
  return callMetaAPI(phoneId, token, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: { link: imageUrl, caption },
  });
}

export async function sendDocumentMessage(
  to: string,
  documentUrl: string,
  phoneId: string,
  token: string
) {
  return callMetaAPI(phoneId, token, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "document",
    document: { link: documentUrl },
  });
}

export async function markMessageAsRead(messageId: string, phoneId: string, token: string) {
  const url = `https://graph.facebook.com/v23.0/${phoneId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

export function verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
  if (!signature || !appSecret) return false;
  const hmac = createHmac("sha256", appSecret);
  hmac.update(payload);
  const digest = "sha256=" + hmac.digest("hex");
  return signature === digest;
}
