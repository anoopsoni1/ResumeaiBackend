import { GoogleGenerativeAI } from "@google/generative-ai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";
import { VideocallInterview } from "../models/VideocallInterview.model.js";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const INTERVIEW_DURATION_MINUTES = 15;

/** Get next AI interviewer question for the given role. Optional: previous Q&A for context. */
export const getNextAiQuestion = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { id } = req.params;
  const { previousQuestions } = req.body || {};

  const interview = await VideocallInterview.findOne({
    _id: id,
    $or: [{ recruiterId: userId }, { candidateId: userId }],
  });
  if (!interview) throw new ApiError(404, "Interview not found");

  const role = interview.role || "Software Engineer";
  if (!genAI) throw new ApiError(503, "AI service not configured (GEMINI_API_KEY)");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const context = Array.isArray(previousQuestions) && previousQuestions.length > 0
    ? `Previous questions asked:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nGenerate the NEXT single question only.`
    : "Generate the FIRST interview question only.";

  const prompt = `You are a professional AI interviewer. The candidate is interviewing for the role: ${role}.

${context}

Rules:
- Ask exactly ONE clear question.
- Be concise (one or two sentences).
- For the first question, you may ask for a brief self-intro or a role-specific technical/behavioral question.
- For follow-up questions, go deeper or move to a new topic relevant to ${role}.
- Do not include numbering or "Question:". Return only the question text.`;

  let question;
  try {
    const result = await model.generateContent(prompt);
    question = result.response.text().trim();
  } catch (err) {
    console.error("[getNextAiQuestion] Gemini fetch failed:", err?.message || err);
    const isFirst = !Array.isArray(previousQuestions) || previousQuestions.length === 0;
    question = isFirst
      ? `Tell me about yourself and your experience relevant to the ${role} role.`
      : `Can you elaborate on that? Or tell me about a challenge you faced in your work.`;
  }

  if (!question) question = "What interests you most about this role?";
  return res.status(200).json(new ApiResponse(200, { question, durationMinutes: INTERVIEW_DURATION_MINUTES }, "OK"));
});
