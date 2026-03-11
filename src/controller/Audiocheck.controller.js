import { GoogleGenerativeAI } from "@google/generative-ai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const evaluateInterview = Asynchandler(async (req, res) => {
  const transcript = req.body.transcript;
  if (!transcript) {
    return res.status(400).json(new ApiResponse(400, null, "Transcript is required"));
  }
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

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

  const result = await model.generateContent(prompt);

  const text = result.response.text();

  const cleaned = text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return res.status(500).json(new ApiResponse(500, null, "Failed to parse AI evaluation"));
  }
  return res.json(new ApiResponse(200, parsed, "Interview evaluated successfully"));
});