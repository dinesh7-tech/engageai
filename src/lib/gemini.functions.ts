import { createServerFn } from "@tanstack/react-start";

export interface AskGeminiInput {
  prompt: string;
  context?: string;
}

export const askGeminiAI = createServerFn({ method: "POST" })
  .inputValidator((input: AskGeminiInput) => input)
  .handler(async ({ data }) => {
    const { askGeminiBrain } = await import("./gemini.server");

    try {
      const response = await askGeminiBrain(data.prompt, data.context);
      return { success: true, answer: response };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      return { success: false, error: errorMsg };
    }
  });

export const checkGeminiStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    const configured = Boolean(apiKey && apiKey.trim().length > 0);
    return {
      configured,
      model: process.env.AI_MODEL || "gemini-2.5-flash",
    };
  });
