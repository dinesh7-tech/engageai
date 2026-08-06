/**
 * Server-only WhatsApp provider adapter.
 *
 * Provider: Meta WhatsApp Business Cloud API.
 *
 * When the credentials are not configured in environment variables or workspace config,
 * sends fall back to simulation so the product stays fully usable.
 */

import { supabase } from "@/integrations/supabase/client";
import { decrypt } from "./whatsapp-encryption";
import {
  sendTextMessage,
  sendTemplateMessage,
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
  let matchedWorkspaceId = workspaceId;
  if (!matchedWorkspaceId) {
    const { data: firstWs } = await supabase.from("workspaces").select("id").limit(1).single();
    matchedWorkspaceId = firstWs?.id;
  }

  if (!matchedWorkspaceId) {
    return { outcome: "simulated", error: "No workspace available to send message." };
  }

  // Fetch workspace credentials override
  const { data: config } = await supabase
    .from("whatsapp_configs")
    .select("*")
    .eq("workspace_id", matchedWorkspaceId)
    .maybeSingle();

  let targetPhoneId: string | undefined;
  let targetToken: string | undefined;

  const configStatus = (config as any)?.verification_status;
  if (config && configStatus === "verified" && config.access_token && config.phone_number_id) {
    // 1. Workspace specific custom account override
    targetPhoneId = config.phone_number_id;
    targetToken = decrypt(config.access_token);
  } else if (process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]) {
    // 2. Fallback to Central Platform EngageAI WhatsApp Business Account
    targetPhoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
    targetToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  }

  if (!targetPhoneId || !targetToken) {
    // Simulated delivery when no credentials exist anywhere
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
      const params = [{ type: "text", text: body }];
      response = await sendTemplateMessage(
        to,
        templateId,
        "en",
        [{ type: "body", parameters: params }],
        targetPhoneId,
        targetToken
      );
    } else {
      response = await sendTextMessage(to, body, targetPhoneId, targetToken);
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

  const msgContent = lastMsg?.message as any;
  return {
    messagesToday: messagesToday || 0,
    lastMessage: msgContent?.body || msgContent?.text?.body || "—",
  };
}
