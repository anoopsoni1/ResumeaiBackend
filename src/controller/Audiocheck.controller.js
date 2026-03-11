import OpenAI from "openai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

const aiClient = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

export const evaluateInterview = Asynchandler(async (req, res) => {
  const transcript = req.body.transcript;
  if (!transcript) {
    return res.status(400).json(new ApiResponse(400, null, "Transcript is required"));
  }
  if (!aiClient) {
    return res.status(503).json(new ApiResponse(503, null, "AI service not configured (GROQ_API_KEY)"));
  }

  const prompt = `
You are a senior technical interviewer with 15+ years of experience.

Evaluate the following interview transcript strictly.

Transcript:
${transcript}

Return ONLY valid JSON in this format:

{
  "technicalScore": number (0-10),
  "communicationScore": number (0-10),
  "confidenceScore": number (0-10),
  "strengths": [],
  "weaknesses": [],
  "improvementPlan": []
}

Do not include markdown.
Do not include explanation.
Only JSON.
`;

  const result = await aiClient.responses.create({
    model: "openai/gpt-oss-20b",
    input: prompt,
  });

  const text = result.output_text || "";

  const cleaned = text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return res.status(500).json(new ApiResponse(500, null, "Failed to parse AI evaluation"));
  }
  return res.json(new ApiResponse(200, parsed, "Interview evaluated successfully"));
});