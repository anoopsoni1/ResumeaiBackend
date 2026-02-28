import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

dotenv.config();



const CheckATSScore = Asynchandler(async (req, res) => {
  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res
      .status(400)
      .json({ message: "resumeText and jobDescription are required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    console.error("ATS check: GEMINI_API_KEY is missing");
    return res.status(503).json({ message: "ATS service is not configured. Please set GEMINI_API_KEY." });
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert Applicant Tracking System (ATS) evaluator. Your task is to assess how well a resume matches a job description and produce a fair, consistent, and accurate score from 0 to 100.

## Scoring criteria (use these to compute the final score)
- **Keyword & skill match (0–40):** Weight how many required and preferred skills/terms from the job description appear in the resume. Exact and close synonyms count. Critical must-have skills missing should heavily reduce this.
- **Experience relevance (0–25):** How relevant is the candidate’s experience to the role? Consider job titles, responsibilities, and industry. More aligned experience = higher score.
- **Structure & clarity (0–15):** Clear sections (e.g. experience, education, skills), readable formatting, and logical flow. Poor structure or missing key sections (e.g. no experience) reduce this.
- **Quantifiable achievements (0–10):** Presence of metrics, numbers, and concrete outcomes (e.g. "increased X by Y%", "managed N users"). Resumes with strong quantifiable results score higher.
- **Education & credentials (0–10):** Match between required/mentioned education or certifications in the job description and what appears in the resume.

**Rules for the score:**
- Output a single integer between 0 and 100. No decimals.
- Be strict but fair: 90+ only for exceptional, highly aligned resumes; 70–89 for good match; 50–69 for partial match; below 50 for weak or off-target resumes.
- Base the score only on the resume and job description provided. Do not guess or assume missing information.

## Your output
1. **score:** One integer 0–100 (overall ATS match).
2. **matchedSkills:** Array of important skills/keywords from the job description that appear in the resume (strings). Include exact and clear synonym matches. Max 15 items.
3. **missingSkills:** Array of important skills/keywords from the job description that are missing or unclear in the resume. Focus on high-impact, frequently mentioned terms. Max 15 items.
4. **summary:** 2–4 sentences describing how well the resume fits the role and the main strengths or gaps. Be specific and neutral.
5. **improvementSuggestions:** 3–5 concrete, actionable suggestions to improve the resume for this job (e.g. "Add keyword 'machine learning' in skills or experience", "Quantify impact in the Project X bullet"). Each item one clear sentence.

## Response format
Respond with ONLY valid JSON. No markdown, no code fences, no extra text before or after the JSON. Use exactly this structure:

{"score":<number>,"matchedSkills":["string"],"missingSkills":["string"],"summary":"string","improvementSuggestions":["string"]}

Ensure: score is number type; matchedSkills, missingSkills, improvementSuggestions are arrays of strings; summary is a single string.

---
JOB DESCRIPTION:
${jobDescription}

---
RESUME:
${resumeText}
`;

    const result = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    let raw =
      (typeof result.text === "string" ? result.text : null) ??
      result.candidates?.[0]?.content?.parts?.map((p) => (p && typeof p.text === "string" ? p.text : "")).join("") ??
      "";

    if (!raw || !raw.trim()) {
      const blockReason = result.promptFeedback?.blockReason ?? result.candidates?.[0]?.finishReason;
      console.error("ATS check: empty Gemini response", { blockReason, hasCandidates: !!result.candidates?.length });
      return res.status(502).json({
        message: "ATS evaluation returned no content. Try again or use a different resume/job description.",
      });
    }

    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error from Gemini:", e, raw);
      return res
        .status(500)
        .json({ message: "Failed to parse ATS JSON from Gemini" });
    }

    const score =
      typeof parsed.score === "number"
        ? Math.round(Math.max(0, Math.min(100, parsed.score)))
        : typeof parsed.score === "string"
          ? Math.round(Math.max(0, Math.min(100, parseFloat(parsed.score) || 0)))
          : 0;

    const matchedSkills = Array.isArray(parsed.matchedSkills)
      ? parsed.matchedSkills.filter((s) => typeof s === "string").slice(0, 15)
      : [];
    const missingSkills = Array.isArray(parsed.missingSkills)
      ? parsed.missingSkills.filter((s) => typeof s === "string").slice(0, 15)
      : [];
    const summary =
      typeof parsed.summary === "string" ? parsed.summary : "";
    const improvementSuggestions = Array.isArray(parsed.improvementSuggestions)
      ? parsed.improvementSuggestions.filter((s) => typeof s === "string").slice(0, 5)
      : [];

    return res.json(
      new ApiResponse(
        200,
        {
          score,
          matchedSkills,
          missingSkills,
          summary,
          improvementSuggestions,
        },
        "ATS score generated successfully"
      )
    );
  } catch (err) {
    console.error("Gemini ATS error:", err?.message ?? err);
    const msg = err?.message ?? "";
    if (msg.includes("API key") || msg.includes("401") || msg.includes("403")) {
      return res.status(503).json({ message: "ATS service authentication failed. Check GEMINI_API_KEY." });
    }
    if (msg.includes("429") || msg.includes("quota") || msg.includes("rate")) {
      return res.status(429).json({ message: "ATS service is busy. Please try again in a moment." });
    }
    return res.status(500).json({
      message: "Error generating ATS score. Please try again.",
    });
  }
});


export {  CheckATSScore };
