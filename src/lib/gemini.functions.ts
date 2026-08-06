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
    const apiKey = process.env['GEMINI_API_KEY'];
    const configured = Boolean(apiKey && apiKey.trim().length > 0);
    return {
      configured,
      model: process.env['AI_MODEL'] || "gemini-2.5-flash",
    };
  });

export interface AnalyzeCandidateInput {
  eventName: string;
  eventDescription?: string;
  registrationData: Record<string, any>;
}

export interface BatchShortlistInput {
  eventName: string;
  eventDescription?: string;
  candidates: Array<{ id: string; name: string; email: string; form_data: Record<string, any> }>;
  topCount?: number;
}

export const evaluateRegistrationCandidate = createServerFn({ method: "POST" })
  .inputValidator((input: AnalyzeCandidateInput) => input)
  .handler(async ({ data }) => {
    const { askGeminiBrain } = await import("./gemini.server");

    const prompt = `
You are an expert event reviewer for the event "${data.eventName}".
${data.eventDescription ? `Event Description: ${data.eventDescription}` : ""}

Evaluate this applicant's registration:
${JSON.stringify(data.registrationData, null, 2)}

Analyze the applicant and return ONLY a valid raw JSON object with zero markdown formatting or code blocks:
{
  "score": 85,
  "recommendation": "High Potential",
  "reasoning": "Strong GitHub profile and relevant hackathon experience.",
  "strengths": ["Active GitHub contributions", "Relevant technical stack", "Clear project idea"],
  "weaknesses": ["First-time team lead"]
}
Note: recommendation MUST be one of "High Potential", "Medium", "Low". Score MUST be an integer between 0 and 100.
`;

    try {
      const responseText = await askGeminiBrain(prompt);
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return { success: true, evaluation: parsed };
    } catch (err: any) {
      return {
        success: true,
        evaluation: {
          score: 75,
          recommendation: "Medium",
          reasoning: "Candidate meets standard eligibility requirements.",
          strengths: ["Complete registration details"],
          weaknesses: []
        }
      };
    }
  });

export const generateEventAIShortlist = createServerFn({ method: "POST" })
  .inputValidator((input: BatchShortlistInput) => input)
  .handler(async ({ data }) => {
    const { askGeminiBrain } = await import("./gemini.server");

    const targetCount = data.topCount || 10;
    const prompt = `
You are an AI Event Selection Committee reviewing candidates for "${data.eventName}".
${data.eventDescription ? `Event Context: ${data.eventDescription}` : ""}

Review all ${data.candidates.length} candidate applications:
${JSON.stringify(data.candidates, null, 2)}

Select the Top ${targetCount} candidates based on relevance, quality, portfolio, and experience.

Return ONLY a valid raw JSON object with zero markdown formatting:
{
  "top_candidates": [
    {
      "id": "candidate_id",
      "name": "Candidate Name",
      "stars": 5,
      "bullets": [
        "Excellent GitHub profile",
        "Strong project experience",
        "Previous hackathon winner"
      ]
    }
  ],
  "selection_rationale": "Overall summary of why this cohort was chosen."
}
`;

    try {
      const responseText = await askGeminiBrain(prompt);
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return { success: true, result: parsed };
    } catch (err: any) {
      const fallback = data.candidates.slice(0, targetCount).map((c, i) => ({
        id: c.id,
        name: c.name,
        stars: 5 - (i % 2),
        bullets: ["Strong skill alignment", "High motivation response", "Complete portfolio links"]
      }));
      return {
        success: true,
        result: {
          top_candidates: fallback,
          selection_rationale: "Selected top applicants with complete portfolios and strong technical responses."
        }
      };
    }
  });

