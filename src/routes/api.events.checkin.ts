import { createFileRoute } from "@tanstack/react-router";
import { checkInAttendeeByQR } from "@/lib/event.functions";

export const Route = createFileRoute("/api/events/checkin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { eventId, registrationId, attendeeId, ticketId, signature, qrPayload, workspaceId, operatorId } = body;

          // Standardize payload into string if JSON object passed directly
          let rawPayload = qrPayload;
          if (!rawPayload && (eventId || registrationId || attendeeId || signature)) {
            rawPayload = JSON.stringify({
              eventId: eventId || "",
              registrationId: registrationId || attendeeId || "",
              attendeeId: attendeeId || registrationId || "",
              ticketId: ticketId || "general",
              signature: signature || "",
              exp: body.exp,
              timestamp: body.timestamp
            });
          }

          if (!rawPayload) {
            return new Response(
              JSON.stringify({
                success: false,
                status: "INVALID",
                message: "Missing QR payload or parameters."
              }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const result = await checkInAttendeeByQR({
            data: {
              qrPayload: typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload),
              eventId: eventId || body.event_id || "",
              workspaceId: workspaceId || body.workspace_id || "",
              operatorId: operatorId || null
            }
          });

          const isSuccess = result.status === "VALID";
          const statusCode = isSuccess ? 200 : result.status === "ALREADY_CHECKED_IN" ? 409 : 400;

          return new Response(
            JSON.stringify({
              success: isSuccess,
              ...result
            }),
            {
              status: statusCode,
              headers: { "Content-Type": "application/json" }
            }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({
              success: false,
              status: "INVALID",
              message: err.message || "Server check-in verification failed."
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }
  }
});
