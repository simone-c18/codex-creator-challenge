import { createGroqChatCompletion, parseJsonObject } from "./groq";

export async function decideFollowUp({
  interviewType,
  persona,
  currentQuestion,
  transcript,
}) {
  const system = `You are conducting a ${interviewType} interview as a ${persona} interviewer.

Given the question asked and the candidate's answer, decide whether to ask a follow-up or move on.

Return ONLY a valid JSON object — no markdown, no backticks:
{
  "action": "follow_up" | "next",
  "follow_up_question": string | null
}

Rules:
- Use "follow_up" if the answer was vague, lacked a specific example, or missed the point of the question
- Use "next" if the answer was complete and sufficient
- If action is "follow_up", follow_up_question must be a specific, probing continuation — not a repeat of the original
- If action is "next", follow_up_question must be null
- Maximum one follow-up per question — never chain two follow-ups in a row`;

  const user = `Question: ${currentQuestion.question}
Intent: ${currentQuestion.intent}
Candidate Answer: ${transcript}`;

  const { text, data } = await createGroqChatCompletion({
    system,
    user,
    maxTokens: 220,
  });

  try {
    return parseJsonObject(text, "Groq");
  } catch (error) {
    console.error("Groq follow-up parse failure:", {
      rawText: text,
      response: data,
      parseError: error,
    });
    throw error;
  }
}
