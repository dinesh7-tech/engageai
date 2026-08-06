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
    const { getWhatsAppConfig } = await import("./whatsapp");
    const { getWhatsAppStats } = await import("./whatsapp.server");
    const { supabase } = await import("@/integrations/supabase/client");

    const config = await getWhatsAppConfig(workspaceId, supabase);
    const stats = await getWhatsAppStats(workspaceId);

    return {
      provider: "Meta WhatsApp Cloud API",
      configured: config.configured,
      fromNumber: config.phoneNumber,
      phoneNumberId: config.phoneId || "—",
      businessAccountId: config.businessId || "—",
      webhookStatus: config.configured ? "Active" : "Disconnected",
      lastMessage: stats.lastMessage,
      messagesToday: stats.messagesToday,
    };
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
