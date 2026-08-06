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

  // ONLY send if verification status is verified and credentials exist
  const isConfigured = config && config.verification_status === "verified" && config.access_token && config.phone_number_id;

  if (!isConfigured) {
    // Simulated delivery when not connected
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

  // Decrypt token securely on the server
  const decryptedToken = decrypt(config.access_token);

  try {
    let response: any;
    if (templateId) {
      const params = [{ type: "text", text: body }];
      response = await sendTemplateMessage(
        to,
        templateId,
        "en",
        [{ type: "body", parameters: params }],
        config.phone_number_id,
        decryptedToken
      );
    } else {
      response = await sendTextMessage(to, body, config.phone_number_id, decryptedToken);
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
