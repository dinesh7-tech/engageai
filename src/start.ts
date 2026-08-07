import { createStart, createCsrfMiddleware as _createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import * as TanstackStart from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Startup validation and fallback resolution
const createCsrfMiddleware =
  typeof _createCsrfMiddleware === "function"
    ? _createCsrfMiddleware
    : typeof (TanstackStart as any)?.createCsrfMiddleware === "function"
      ? (TanstackStart as any).createCsrfMiddleware
      : undefined;

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Create CSRF middleware safely
const csrfMiddleware = createCsrfMiddleware
  ? createCsrfMiddleware({
      filter: (ctx: any) => ctx.handlerType === "serverFn",
    })
  : createMiddleware().server(async ({ next }) => next());

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));

