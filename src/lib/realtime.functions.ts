import { createServerFn } from "@tanstack/react-start";

export const emitActivity = createServerFn({ method: "POST" })
  .inputValidator((input: { workspaceId?: string; actor: string; text: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("activity_events").insert({
      workspace_id: data.workspaceId ?? "ws_1",
      actor: data.actor,
      text: data.text,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const emitNotification = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      workspaceId?: string;
      title: string;
      body: string;
      severity?: "info" | "success" | "warning" | "destructive";
    }) => input,
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert({
      workspace_id: data.workspaceId ?? "ws_1",
      title: data.title,
      body: data.body,
      severity: data.severity ?? "info",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
