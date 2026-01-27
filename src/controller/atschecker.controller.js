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
    const prompt = `
You are an ATS-like resume evaluator.

Given a JOB DESCRIPTION and a RESUME, do the following:
1. Calculate an overall match score from 0 to 100 (integer).
2. List important skills / keywords that are present in the resume.
3. List important skills / keywords that are missing from the resume.
4. Provide a short summary of how well the resume fits.
5. Provide 3–5 concrete improvement suggestions.

Very important:
- Respond ONLY as valid JSON.
- Do NOT wrap the response in markdown.
- Use exactly this JSON structure:

{
  "score": number,
  "matchedSkills": string[],
  "missingSkills": string[],
  "summary": string,
  "improvementSuggestions": string[]
}

JOB DESCRIPTION:
${jobDescription}

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
