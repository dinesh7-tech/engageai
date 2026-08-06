import { createServerFn } from "@tanstack/react-start";
import {
  isValidPhone,
  normalizePhone,
  renderTemplate,
  type WhatsAppTemplateId,
} from "./whatsapp-templates";

export interface SendWhatsAppInput {
  to: string;
  templateId: WhatsAppTemplateId;
  variables?: Record<string, string | number>;
  /** Overrides the rendered template body (used by the test console). */
  body?: string;
  workspaceId?: string;
}

export interface SendWhatsAppResult {
  outcome: "sent" | "simulated" | "failed";
  to: string;
  body: string;
  templateId: WhatsAppTemplateId;
  providerId?: string;
  error?: string;
  sentAt: string;
}

/** Reports whether the WhatsApp provider credentials are wired up. */
export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .inputValidator((workspaceId: string) => workspaceId || "")
  .handler(async ({ data: workspaceId }) => {
    const { getWhatsAppStats } = await import("./whatsapp.server");
    const { supabase } = await import("@/integrations/supabase/client");

    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const stats = await getWhatsAppStats(workspaceId);
    const hasCustomConfig = config && config.verification_status === "verified";
    const hasCentralConfig = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    const configured = Boolean(hasCustomConfig || hasCentralConfig);
    const mode = hasCustomConfig ? "Custom Workspace Account" : hasCentralConfig ? "EngageAI Shared Account" : "Simulation Mode";

    return {
      provider: "Meta WhatsApp Cloud API",
      configured,
      mode,
      verificationStatus: hasCustomConfig ? "verified" : hasCentralConfig ? "verified" : (config?.verification_status || "pending"),
      fromNumber: hasCustomConfig ? config?.phone_number : (process.env.WHATSAPP_FROM_NUMBER || "+14155238886"),
      phoneNumberId: hasCustomConfig ? config?.phone_number_id : (process.env.WHATSAPP_PHONE_NUMBER_ID || "—"),
      businessAccountId: hasCustomConfig ? config?.business_account_id : (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "—"),
      webhookStatus: configured ? "connected" : "disconnected",
      lastMessage: stats.lastMessage,
      messagesToday: stats.messagesToday,
    };
  });

export interface SaveWhatsAppConfigInput {
  workspaceId: string;
  phoneId: string;
  businessId: string;
  verifyToken: string;
  fromNumber: string;
  appId: string;
  appSecret: string;
  accessToken: string;
}

export const saveWhatsAppConfig = createServerFn({ method: "POST" })
  .inputValidator((input: SaveWhatsAppConfigInput) => input)
  .handler(async ({ data }) => {
    const { encrypt } = await import("./whatsapp-encryption");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Encrypt sensitive fields
    const encryptedToken = encrypt(data.accessToken);
    const encryptedSecret = encrypt(data.appSecret);

    // 2. Perform test connection to Meta Graph API
    const testUrl = `https://graph.facebook.com/v23.0/${data.phoneId}`;
    try {
      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${data.accessToken}`
        }
      });
      const resBody = await response.json();
      
      if (!response.ok) {
        throw new Error(resBody.error?.message || `Meta API returned status ${response.status}`);
      }
    } catch (err: any) {
      // Mark as failed verification if the check fails
      await supabaseAdmin
        .from("whatsapp_configs")
        .upsert({
          workspace_id: data.workspaceId,
          access_token: encryptedToken,
          phone_number_id: data.phoneId,
          business_account_id: data.businessId,
          verify_token: data.verifyToken,
          phone_number: data.fromNumber,
          app_id: data.appId,
          app_secret: encryptedSecret,
          verification_status: "failed",
          webhook_status: "disconnected"
        });
      throw new Error(`Meta API validation failed: ${err.message}`);
    }

    // 3. Save successfully verified config
    const { error } = await supabaseAdmin
      .from("whatsapp_configs")
      .upsert({
        workspace_id: data.workspaceId,
        access_token: encryptedToken,
        phone_number_id: data.phoneId,
        business_account_id: data.businessId,
        verify_token: data.verifyToken,
        phone_number: data.fromNumber,
        app_id: data.appId,
        app_secret: encryptedSecret,
        verification_status: "verified",
        webhook_status: "connected"
      });

    if (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }

    return { success: true };
  });

/** Renders a template and sends it over WhatsApp (or simulates when unconfigured). */
export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .inputValidator((input: SendWhatsAppInput) => {
    if (!input || typeof input.to !== "string" || !isValidPhone(input.to)) {
      throw new Error("A valid WhatsApp number in international format (+…) is required");
    }
    if (typeof input.templateId !== "string") {
      throw new Error("A template is required");
    }
    if (input.body !== undefined && input.body.trim().length > 1600) {
      throw new Error("Message body must be 1600 characters or fewer");
    }
    return {
      to: normalizePhone(input.to),
      templateId: input.templateId,
      variables: input.variables ?? {},
      body: input.body,
      workspaceId: input.workspaceId,
    };
  })
  .handler(async ({ data }): Promise<SendWhatsAppResult> => {
    const body = data.body?.trim()
      ? data.body.trim()
      : renderTemplate(data.templateId, data.variables);

    const { sendWhatsApp } = await import("./whatsapp.server");
    const result = await sendWhatsApp(data.to, body, data.workspaceId, data.templateId);

    return {
      outcome: result.outcome,
      to: data.to,
      body,
      templateId: data.templateId,
      sentAt: new Date().toISOString(),
      ...(result.providerId ? { providerId: result.providerId } : {}),
      ...(result.error ? { error: result.error } : {}),
    };
  });

