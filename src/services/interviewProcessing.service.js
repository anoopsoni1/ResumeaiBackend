import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { VideocallInterview } from "../models/VideocallInterview.model.js";

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/** Download recording from URL, transcribe with Gemini, evaluate transcript, save to interview. */
export async function processInterviewRecording(interviewId) {
  const interview = await VideocallInterview.findById(interviewId);
  if (!interview || !interview.recordingUrl) {
    return;
  }
  if (!genAI) {
    await VideocallInterview.findByIdAndUpdate(interviewId, { status: "completed" });
    return;
  }
  try {
    const response = await axios.get(interview.recordingUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const mimeType = (response.headers["content-type"] || "video/mp4").split(";")[0].trim();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const transcriptResult = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType.includes("video") ? mimeType : "audio/webm",
        },
      },
      "Transcribe this interview recording accurately. Include both interviewer and candidate speech.",
    ]);
    const transcript = transcriptResult.response.text();

    const evalPrompt = `You are a senior technical interviewer with 15+ years of experience. Evaluate the interview transcript STRICTLY and give scores only based on evidence in the transcript.

SCORING RULES (each score must be 0-10, integers only):
- technicalScore: Technical accuracy, relevance of answers, depth of knowledge shown. 0 = no/irrelevant technical content, 10 = excellent technical depth and accuracy.
- communicationScore: Clarity, structure, conciseness, language. 0 = unclear or missing, 10 = very clear and professional.
- confidenceScore: How confidently the candidate answered, hesitation, filler words. 0 = very unsure or silent, 10 = confident and composed.

REQUIREMENTS:
- Give scores strictly from 0 to 10. No decimals. Base scores ONLY on what is in the transcript.
- strengths: array of 2-5 short strings (specific, evidence-based).
- weaknesses: array of 2-5 short strings (specific, constructive).
- improvementPlan: array of 2-5 short strings (actionable next steps).

Transcript:
${transcript}

Return ONLY valid JSON. No markdown, no code fence, no explanation. Example shape:
{"technicalScore":7,"communicationScore":8,"confidenceScore":6,"strengths":["Clear API experience","Structured answers"],"weaknesses":["Could add more examples"],"improvementPlan":["Practice STAR format","Add metrics to answers"]}`;

    const evalResult = await model.generateContent(evalPrompt);
    let text = evalResult.response.text();
    text = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    let aiReport;
    try {
      aiReport = JSON.parse(text);
    } catch (parseErr) {
      console.error("[processInterviewRecording] Invalid JSON from Gemini", interviewId, text?.slice(0, 200));
      throw parseErr;
    }

    // Strict validation and normalization: clamp scores 0-10, ensure arrays
    const clamp = (n) => (typeof n === "number" && !Number.isNaN(n) ? Math.min(10, Math.max(0, Math.round(n))) : null);
    aiReport = {
      technicalScore: clamp(aiReport.technicalScore) ?? clamp(parseFloat(aiReport.technicalScore)),
      communicationScore: clamp(aiReport.communicationScore) ?? clamp(parseFloat(aiReport.communicationScore)),
      confidenceScore: clamp(aiReport.confidenceScore) ?? clamp(parseFloat(aiReport.confidenceScore)),
      strengths: Array.isArray(aiReport.strengths) ? aiReport.strengths.filter((s) => typeof s === "string").slice(0, 10) : [],
      weaknesses: Array.isArray(aiReport.weaknesses) ? aiReport.weaknesses.filter((s) => typeof s === "string").slice(0, 10) : [],
      improvementPlan: Array.isArray(aiReport.improvementPlan) ? aiReport.improvementPlan.filter((s) => typeof s === "string").slice(0, 10) : [],
    };

    await VideocallInterview.findByIdAndUpdate(interviewId, {
      transcript,
      aiReport,
      status: "completed",
    });
  } catch (err) {
    console.error("[processInterviewRecording]", interviewId, err?.message || err);
    await VideocallInterview.findByIdAndUpdate(interviewId, { status: "completed" });
  }
}
