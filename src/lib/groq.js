const SYSTEM_PROMPT = `You are an expert interview coach. Given a job description and interview type, generate exactly 7 interview questions tailored to the role.

Return ONLY a valid JSON object matching this schema — no markdown, no explanation, no backticks:
{
  "questions": [
    {
      "id": number,
      "question": string,
      "category": "behavioral" | "technical" | "hr",
      "difficulty": "easy" | "medium" | "hard",
      "follow_ups": [string, string],
      "intent": string
    }
  ]
}

Rules:
- Difficulty should ramp: 2 easy, 3 medium, 2 hard
- follow_ups must be natural continuations, not repetitions of the main question
- intent should be one sentence describing what competency this question reveals
- Tailor every question to the specific role and company in the JD — no generic questions
- Keep all text concise: each question should usually be one sentence, each follow-up should be short, and intent should be under 18 words`;

function getGroqApiKey() {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_GROQ_API_KEY");
  }

  return apiKey;
}

async function createGroqChatCompletion({ system, user, maxTokens = 1400 }) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGroqApiKey()}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: user,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const apiMessage =
      data?.error?.message || `Groq request failed with status ${response.status}.`;
    throw new Error(apiMessage);
  }

  const text = data?.choices?.[0]?.message?.content || "";

  if (!text.trim()) {
    const finishReason = data?.choices?.[0]?.finish_reason;
    throw new Error(
      finishReason
        ? `Groq returned no text output. Finish reason: ${finishReason}.`
        : "Groq returned no text output.",
    );
  }

  return { text, data };
}

function parseJsonObject(text, providerLabel) {
  const sanitized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(sanitized);
  } catch {
    const firstBraceIndex = sanitized.indexOf("{");
    const lastBraceIndex = sanitized.lastIndexOf("}");

    if (firstBraceIndex !== -1 && lastBraceIndex !== -1) {
      return JSON.parse(sanitized.slice(firstBraceIndex, lastBraceIndex + 1));
    }

    throw new Error(`No JSON object found in ${providerLabel} response.`);
  }
}

export async function generateInterviewQuestions({
  jd,
  interviewType,
  persona,
}) {
  const { text, data } = await createGroqChatCompletion({
    system: SYSTEM_PROMPT,
    user: `Job Description: ${jd}\n\nInterview Type: ${interviewType}\n\nPersona: ${persona}`,
    maxTokens: 1400,
  });

  try {
    const parsed = parseJsonObject(text, "Groq");

    if (!Array.isArray(parsed?.questions)) {
      throw new Error("Groq response did not include a questions array.");
    }

    return parsed.questions;
  } catch (error) {
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 180);

    console.error("Groq question generation parse failure:", {
      rawText: text,
      preview,
      response: data,
      parseError: error,
    });

    throw new Error(
      preview
        ? `Failed to generate questions — Groq returned: ${preview}`
        : "Failed to generate questions — please try again.",
      { cause: error },
    );
  }
}

export { createGroqChatCompletion, parseJsonObject };
