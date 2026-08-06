/**
 * Server-only WhatsApp provider adapter.
 *
 * Provider: Meta WhatsApp Business Cloud API.
 *
 * When the credentials are not configured in environment variables or workspace config,
 * sends fall back to simulation so the product stays fully usable.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  sendTextMessage,
  sendTemplateMessage,
  getWhatsAppConfig,
} from "./whatsapp";

export type SendOutcome = "sent" | "simulated" | "failed";

export interface ProviderResult {
  outcome: SendOutcome;
  providerId?: string;
  error?: string;
}

export async function sendWhatsApp(
  to: string,
  body: string,
  workspaceId?: string,
  templateId?: string
): Promise<ProviderResult> {
  // Fall back to a default workspace if none is supplied
  let matchedWorkspaceId = workspaceId;
  if (!matchedWorkspaceId) {
    const { data: firstWs } = await supabase.from("workspaces").select("id").limit(1).single();
    matchedWorkspaceId = firstWs?.id;
  }

  if (!matchedWorkspaceId) {
    return { outcome: "simulated", error: "No workspace available to send message." };
  }

  const config = await getWhatsAppConfig(matchedWorkspaceId, supabase);

  if (!config.configured) {
    // Simulated delivery
    await supabase.from("whatsapp_messages").insert({
      workspace_id: matchedWorkspaceId,
      phone: to,
      direction: "outbound",
      message_type: "text",
      message: { body },
      status: "simulated",
    });
    return { outcome: "simulated" };
  }

  try {
    let response: any;
    if (templateId) {
      // Send template formatted components (requires Meta approval matching template variables)
      // Meta requires parameters nested inside components
      const params = [{ type: "text", text: body }];
      response = await sendTemplateMessage(
        to,
        templateId,
        "en",
        [{ type: "body", parameters: params }],
        config.phoneId!,
        config.token!
      );
    } else {
      // Send text message directly
      response = await sendTextMessage(to, body, config.phoneId!, config.token!);
    }

    const metaId = response?.messages?.[0]?.id || "";

    await supabase.from("whatsapp_messages").insert({
      workspace_id: matchedWorkspaceId,
      phone: to,
      direction: "outbound",
      message_type: templateId ? "template" : "text",
      message: { body },
      status: "sent",
      meta_message_id: metaId,
    });

    return { outcome: "sent", providerId: metaId };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    await supabase.from("whatsapp_messages").insert({
      workspace_id: matchedWorkspaceId,
      phone: to,
      direction: "outbound",
      message_type: templateId ? "template" : "text",
      message: { body },
      status: "failed",
      error_message: errorMsg,
    });
    return { outcome: "failed", error: errorMsg };
  }
}

export async function getWhatsAppStats(workspaceId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: messagesToday } = await supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", todayStart.toISOString());

  const { data: lastMsg } = await supabase
    .from("whatsapp_messages")
    .select("message, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    messagesToday: messagesToday || 0,
    lastMessage: lastMsg?.message?.body || lastMsg?.message?.text?.body || "—",
  };
}
