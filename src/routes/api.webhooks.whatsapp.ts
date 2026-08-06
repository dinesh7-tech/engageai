import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { verifyWebhookSignature } from "@/lib/whatsapp";

export const Route = createFileRoute("/api/webhooks/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifyToken = process.env["WHATSAPP_VERIFY_TOKEN"];

        if (mode === "subscribe" && token === verifyToken) {
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const signature = request.headers.get("x-hub-signature-256") || "";
        const appSecret = process.env["WHATSAPP_APP_SECRET"] || process.env["META_APP_SECRET"] || "";
        const rawBody = await request.text();

        // 1. Signature Verification
        if (appSecret && !verifyWebhookSignature(rawBody, signature, appSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        
        // 2. Event Extraction
        const entry = payload.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        
        if (!value) return new Response("OK", { status: 200 });

        // Handle Messages (Inbound)
        if (value.messages?.length > 0) {
          for (const msg of value.messages) {
            const metaId = msg.id;
            
            // Check for duplicates
            const { data: duplicate } = await supabase
              .from("whatsapp_messages")
              .select("id")
              .eq("meta_message_id", metaId)
              .maybeSingle();

            if (duplicate) continue;

            const fromPhone = msg.from;
            const messageType = msg.type;
            let textContent = "";

            if (messageType === "text") {
              textContent = msg.text?.body || "";
            } else if (messageType === "image") {
              textContent = "[Image Message]";
            } else if (messageType === "document") {
              textContent = "[Document Message]";
            }

            // Find matching workspace by analyzing config table, queue list, or active memberships
            let workspaceId = "";
            const { data: matchedConfig } = await supabase
              .from("whatsapp_configs")
              .select("workspace_id")
              .eq("phone_number_id", value.metadata?.phone_number_id)
              .maybeSingle();

            if (matchedConfig) {
              workspaceId = matchedConfig.workspace_id;
            } else {
              // Fallback to active waitlists or the first workspace
              const { data: activeQueue } = await supabase
                .from("queue_entries")
                .select("workspace_id")
                .eq("customer_phone", "+" + fromPhone)
                .eq("status", "waiting")
                .limit(1)
                .maybeSingle();
              
              if (activeQueue) {
                workspaceId = activeQueue.workspace_id;
              } else {
                const { data: firstWs } = await supabase.from("workspaces").select("id").limit(1).single();
                if (firstWs) workspaceId = firstWs.id;
              }
            }

            if (workspaceId) {
              // Insert message
              await supabase.from("whatsapp_messages").insert({
                workspace_id: workspaceId,
                phone: "+" + fromPhone,
                direction: "inbound",
                message_type: messageType,
                message: { body: textContent, raw: msg },
                status: "received",
                meta_message_id: metaId,
              });

              // Trigger Exit trigger if inbound message contains LEAVE
              if (textContent.toUpperCase().trim() === "LEAVE") {
                // Exit waitlist queue
                await supabase
                  .from("queue_entries")
                  .update({ status: "exited" })
                  .eq("customer_phone", "+" + fromPhone)
                  .eq("status", "waiting");
              }
            }
          }
        }

        // Handle Status updates
        if (value.statuses?.length > 0) {
          for (const status of value.statuses) {
            const metaId = status.id;
            const statusValue = status.status; // sent, delivered, read, failed

            await supabase
              .from("whatsapp_messages")
              .update({ status: statusValue })
              .eq("meta_message_id", metaId);
          }
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
