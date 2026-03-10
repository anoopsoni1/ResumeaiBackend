import { GoogleGenerativeAI } from "@google/generative-ai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const ROADMAP_JSON_SCHEMA = `
Return ONLY valid JSON in this exact shape (no markdown, no code fences, no extra text):
{
  "phases": [
    {
      "title": "string",
      "description": "string",
      "duration": "string",
      "skills": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "skills": ["string"],
      "difficulty": "string"
    }
  ],
  "missingSkills": ["string"],
  "learningResources": [
    {
      "skill": "string",
      "resources": [
        { "title": "string", "url": "string", "type": "string" }
      ]
    }
  ]
}`;

/**
 * POST /api/generate-roadmap
 * Body: { careerGoal, skills, experience, months }
 */
export const generateRoadmap = Asynchandler(async (req, res) => {
  if (!genAI) throw new ApiError(503, "AI service not configured (GEMINI_API_KEY)");

  const { careerGoal, skills, experience, months } = req.body || {};

  if (!careerGoal || typeof careerGoal !== "string" || !careerGoal.trim()) {
    throw new ApiError(400, "careerGoal is required");
  }

  const skillsList = Array.isArray(skills)
    ? skills
    : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const experienceLevel = experience || "Beginner";
  const monthsNum = Math.max(1, Math.min(24, Number(months) || 6));

  const prompt = `Create a structured learning roadmap to become a ${careerGoal.trim()}.
User current skills: ${skillsList.length ? skillsList.join(", ") : "None listed"}.
Experience level: ${experienceLevel}.
Time available: ${monthsNum} months.

${ROADMAP_JSON_SCHEMA}

Generate a practical, phased roadmap with 3-6 phases, 3-5 projects, missing skills to learn, and learning resources (with real or placeholder URLs).`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let response;
  try {
    const result = await model.generateContent(prompt);
    response = result.response.text();
  } catch (err) {
    console.error("[generateRoadmap] Gemini error:", err?.message || err);
    throw new ApiError(502, "AI service failed to generate roadmap");
  }

  if (!response || typeof response !== "string") {
    throw new ApiError(502, "Empty AI response");
  }

  const jsonStr = response
    .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
    .replace(/\s*```[\s\S]*$/i, "")
    .trim();

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error("[generateRoadmap] JSON parse error:", e?.message, "raw:", jsonStr?.slice(0, 300));
    throw new ApiError(502, "AI returned invalid JSON");
  }

  const normalized = {
    phases: Array.isArray(data.phases) ? data.phases : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    missingSkills: Array.isArray(data.missingSkills) ? data.missingSkills : [],
    learningResources: Array.isArray(data.learningResources) ? data.learningResources : [],
  };

  return res
    .status(200)
    .json(new ApiResponse(200, normalized, "Roadmap generated"));
});
