import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CheckATSScore = Asynchandler(async (req, res) => {
  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res
      .status(400)
      .json({ message: "resumeText and jobDescription are required" });
  }

  try {
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
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    let raw =
      result.text ??
      result.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") ??
      "";

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

    return res.json(
      new ApiResponse(
        200,
        {
          score: parsed.score,
          matchedSkills: parsed.matchedSkills,
          missingSkills: parsed.missingSkills,
          summary: parsed.summary,
          improvementSuggestions: parsed.improvementSuggestions,
        },
        "ATS score generated successfully"
      )
    );
  } catch (err) {
    console.error("Gemini ATS error:", err);
    return res.status(500).json({ message: "Error generating ATS score" });
  }
});


export {  CheckATSScore };
