/**
 * Server-only Google Gemini AI Service Adapter.
 * Uses the gemini-2.5-flash model via Google Generative Language REST API.
 * Keeps API keys securely server-side.
 */

export interface GeminiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateWithGemini(options: GeminiGenerateOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API key is not configured.");
  }

  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [
      {
        parts: [
          {
            text: options.prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
  };

  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [
        {
          text: options.systemInstruction,
        },
      ],
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || `Gemini API call failed with status ${response.status}`;
    throw new Error(`Gemini API Error: ${msg}`);
  }

  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error("Gemini API returned an empty response.");
  }

  return candidateText;
}

/**
 * Higher-level system instruction grounded for EngageAI Brain persona.
 */
export async function askGeminiBrain(prompt: string, contextInfo?: string): Promise<string> {
  const systemInstruction = `
You are EngageAI Brain, the intelligent AI assistant for the EngageAI platform.
Your goal is to help business owners automate customer engagement, event management, queue management, customer support, analytics and marketing using the features available inside EngageAI.
Never invent features that do not exist.
Platform Modules: QueueAI, EventAI, WhatsApp Automation, Customer Reviews, Analytics, Automation Workflows, Dashboard, Workspace Settings.
Always respond professionally, concisely, and actionable.
Whenever possible, end with a short "Recommended Next Action" section.
Never expose API keys, credentials or internal DB schema.
${contextInfo ? `Current Workspace Context: ${contextInfo}` : ""}
`;

  return generateWithGemini({
    prompt,
    systemInstruction,
    temperature: 0.6,
  });
}
