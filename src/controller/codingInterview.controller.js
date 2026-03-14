import { GoogleGenerativeAI } from "@google/generative-ai";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";
import { InterviewSession } from "../models/InterviewSession.model.js";
import { incrementDailyUserCount } from "../utils/dailyCount.js";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const JUDGE0_BASE = process.env.JUDGE0_BASE_URL || "https://ce.judge0.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  go: 60,
};

function parseJsonFromAi(text) {
  const cleaned = (text || "")
    .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
    .replace(/\s*```[\s\S]*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/** POST /api/interview/question - Generate coding question via Gemini */
export const generateQuestion = Asynchandler(async (req, res) => {
  if (!genAI) throw new ApiError(503, "AI service not configured (GEMINI_API_KEY)");
  const { role, difficulty } = req.body || {};
  if (!role || !difficulty) throw new ApiError(400, "role and difficulty are required");

  const difficultyGuidance =
    difficulty === "Beginner"
      ? "MUST be very easy: simple loops, basic arrays/strings, no complex data structures. Think: sum of array, find max, count occurrences, simple string operations. No recursion, no trees/graphs, no dynamic programming."
      : difficulty === "Intermediate"
        ? "Moderate: can use hash maps, two pointers, simple recursion, basic sorting."
        : difficulty === "Advanced"
          ? "Hard: trees, graphs, dynamic programming, advanced algorithms allowed."
          : "FAANG-level: challenging problems, optimal time/space, multiple approaches.";

  const prompt = `Generate exactly one coding interview question for a ${role} developer.
Difficulty: ${difficulty}.
${difficultyGuidance}

Return ONLY valid JSON (no markdown, no code fences):
{
  "title": "string",
  "description": "string",
  "dataStructure": "string (e.g. Array, String, Hash Map, Tree, Graph - one primary structure)",
  "algorithm": "string (e.g. Two Pointers, Sliding Window, Binary Search, BFS/DFS - one primary approach)",
  "examples": [{"input": "string", "output": "string"}],
  "constraints": ["string"],
  "testCases": [{"input": "string", "expectedOutput": "string"}]
}

Include 3-5 test cases. Make description clear and examples helpful. For Beginner, keep inputs and logic very simple.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const data = parseJsonFromAi(text);
  if (!data || !data.title) throw new ApiError(502, "AI returned invalid question format");

  const normalized = {
    title: data.title,
    description: data.description || "",
    dataStructure: typeof data.dataStructure === "string" ? data.dataStructure : "",
    algorithm: typeof data.algorithm === "string" ? data.algorithm : "",
    examples: Array.isArray(data.examples) ? data.examples : [],
    constraints: Array.isArray(data.constraints) ? data.constraints : [],
    testCases: Array.isArray(data.testCases) ? data.testCases : [],
  };

  return res
    .status(200)
    .json(new ApiResponse(200, normalized, "Question generated"));
});

const QUESTION_COUNT = 15;

/** POST /api/interview-questions - Generate multiple questions (e.g. 15 for full interview) */
export const generateQuestions = Asynchandler(async (req, res) => {
  if (!genAI) throw new ApiError(503, "AI service not configured (GEMINI_API_KEY)");
  const { role, difficulty } = req.body || {};
  const count = Math.min(Math.max(Number(req.body?.count) || QUESTION_COUNT, 1), 20);
  if (!role || !difficulty) throw new ApiError(400, "role and difficulty are required");

  const difficultyGuidance =
    difficulty === "Beginner"
      ? "MUST be very easy: simple loops, basic arrays/strings. No recursion, no trees/graphs, no DP."
      : difficulty === "Intermediate"
        ? "Moderate: hash maps, two pointers, simple recursion."
        : difficulty === "Advanced"
          ? "Hard: trees, graphs, DP allowed."
          : "FAANG-level: challenging, optimal time/space.";

  const prompt = `Generate exactly ${count} different coding interview questions for a ${role} developer. Difficulty: ${difficulty}. ${difficultyGuidance}

Return ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    {
      "title": "string",
      "description": "string",
      "dataStructure": "string",
      "algorithm": "string",
      "examples": [{"input": "string", "output": "string"}],
      "constraints": ["string"],
      "testCases": [{"input": "string", "expectedOutput": "string"}]
    }
  ]
}
Each question must be unique. Include 2-4 test cases per question. For Beginner keep each question very simple.`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const data = parseJsonFromAi(text);
  const rawList = data?.questions || (Array.isArray(data) ? data : []);
  const questions = rawList
    .slice(0, count)
    .map((q) => ({
      title: q.title || "Question",
      description: q.description || "",
      dataStructure: typeof q.dataStructure === "string" ? q.dataStructure : "",
      algorithm: typeof q.algorithm === "string" ? q.algorithm : "",
      examples: Array.isArray(q.examples) ? q.examples : [],
      constraints: Array.isArray(q.constraints) ? q.constraints : [],
      testCases: Array.isArray(q.testCases) ? q.testCases : [],
    }));

  if (questions.length === 0) throw new ApiError(502, "AI returned no valid questions");
  return res.status(200).json(new ApiResponse(200, { questions }, "Questions generated"));
});

/** POST /api/run-code - Execute code via Judge0 and evaluate against test cases */
export const runCode = Asynchandler(async (req, res) => {
  const { code, language, testCases } = req.body || {};
  if (!code || !language) throw new ApiError(400, "code and language are required");

  const langId = LANGUAGE_IDS[language.toLowerCase()] ?? LANGUAGE_IDS.javascript;
  const cases = Array.isArray(testCases) && testCases.length > 0 ? testCases : [];

  const runOne = async (stdin, expectedOutput) => {
    const url = `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`;
    const headers = {
      "Content-Type": "application/json",
      ...(JUDGE0_API_KEY ? { "X-RapidAPI-Key": JUDGE0_API_KEY } : {}),
    };
    const body = {
      source_code: code,
      language_id: langId,
      stdin: stdin || "",
    };
    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!resp.ok) throw new ApiError(502, "Judge0 execution failed");
    const result = await resp.json();
    const stdout = (result.stdout || "").trim();
    const stderr = result.stderr || "";
    const statusId = result.status?.id;
    const isError = statusId >= 6;
    const actual = isError ? (result.message || stderr || "Runtime error") : stdout;
    const passed = !isError && actual === (expectedOutput || "").trim();
    return { passed, actual, expected: expectedOutput, error: isError, message: result.message };
  };

  let passed = 0;
  const results = [];

  if (cases.length > 0) {
    for (const tc of cases) {
      const r = await runOne(tc.input, tc.expectedOutput);
      results.push(r);
      if (r.passed) passed++;
    }
  } else {
    const r = await runOne("", "");
    results.push(r);
    if (r.passed) passed = r.passed ? 1 : 0;
  }

  const total = cases.length || 1;
  const maxScore = 10;
  const score = total > 0 ? Math.round((passed / total) * maxScore) : 0;

  return res.status(200).json(
    new ApiResponse(200, {
      status: "success",
      passed,
      failed: total - passed,
      total,
      score,
      maxScore,
      results,
    })
  );
});

/** POST /api/code-review - AI review of user code */
export const codeReview = Asynchandler(async (req, res) => {
  if (!genAI) throw new ApiError(503, "AI service not configured");
  const { problemDescription, userCode } = req.body || {};
  if (!problemDescription || !userCode) throw new ApiError(400, "problemDescription and userCode required");

  const prompt = `Review this code written for the following problem:

Problem:
${problemDescription}

Code:
\`\`\`
${userCode}
\`\`\`

Return ONLY valid JSON (no markdown, no code fences):
{
  "quality": "brief assessment of code quality",
  "complexity": "time and space complexity",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "edgeCasesMissed": ["edge case 1"]
}`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const data = parseJsonFromAi(text) || {};
  const feedback = {
    quality: data.quality || "",
    complexity: data.complexity || "",
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    edgeCasesMissed: Array.isArray(data.edgeCasesMissed) ? data.edgeCasesMissed : [],
  };

  return res.status(200).json(new ApiResponse(200, feedback));
});

/** POST /api/follow-up - AI follow-up interview question */
export const followUpQuestion = Asynchandler(async (req, res) => {
  if (!genAI) throw new ApiError(503, "AI service not configured");
  const { problemTitle, userCode, previousQuestions } = req.body || {};
  if (!problemTitle) throw new ApiError(400, "problemTitle required");

  const context = Array.isArray(previousQuestions) && previousQuestions.length > 0
    ? `Previously asked: ${previousQuestions.join(" | ")}. Ask a different follow-up.`
    : "";

  const prompt = `You are an interviewer. The candidate just solved: "${problemTitle}".
${userCode ? `Their code:\n\`\`\`\n${userCode}\n\`\`\`` : ""}
${context}

Generate ONE short interview follow-up question (1-2 sentences). Examples: "Why did you choose this approach?", "What is the time complexity?", "Can this be optimized?", "What happens for large inputs?"

Return ONLY a plain text question, no JSON, no quotes.`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const question = result.response.text().trim();

  return res.status(200).json(new ApiResponse(200, { question }));
});

/** POST /api/interview/save - Save session (optional auth) */
export const saveSession = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  const body = req.body || {};
  if (!userId) throw new ApiError(401, "Login required to save session");

  const session = await InterviewSession.create({
    userId,
    question: body.question || {},
    code: body.code || "",
    language: body.language || "javascript",
    score: body.score ?? 0,
    maxScore: body.maxScore ?? 10,
    passed: body.passed ?? 0,
    totalTests: body.totalTests ?? 0,
    feedback: body.feedback || "",
    aiReview: body.aiReview || {},
    followUpQa: Array.isArray(body.followUpQa) ? body.followUpQa : [],
    runOutput: body.runOutput || "",
    status: body.status || "submitted",
  });

  return res.status(201).json(new ApiResponse(201, session));
});

/** GET /api/leaderboard - Top coders by total score */
export const getLeaderboard = Asynchandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const agg = await InterviewSession.aggregate([
    { $match: { status: "submitted" } },
    { $group: { _id: "$userId", totalScore: { $sum: "$score" } } },
    { $sort: { totalScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        totalScore: 1,
        name: { $concat: ["$user.FirstName", " ", "$user.LastName"] },
      },
    },
  ]);

  const leaderboard = agg.map((r, i) => ({
    rank: i + 1,
    name: r.name || "Anonymous",
    score: r.totalScore,
  }));

  return res.status(200).json(new ApiResponse(200, leaderboard));
});

/** GET /api/interview/history - User's past sessions (optional auth) */
export const getHistory = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Login required");
  const sessions = await InterviewSession.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("question.title score maxScore passed totalTests createdAt language status");
  return res.status(200).json(new ApiResponse(200, sessions));
});

/** POST /api/v1/user/coding-interview - Create coding interview session (verifyJWT). Supports single question or multi-question (attempts array). */
export const createCodingInterview = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const body = req.body || {};
  const attempts = Array.isArray(body.attempts) ? body.attempts : [];
  const totalScore = attempts.length > 0
    ? attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0)
    : (body.score ?? 0);

  const session = await InterviewSession.create({
    userId,
    question: body.question || {},
    code: body.code || "",
    language: body.language || "javascript",
    score: totalScore,
    maxScore: attempts.length > 0 ? attempts.length * 10 : (body.maxScore ?? 10),
    passed: body.passed ?? 0,
    totalTests: body.totalTests ?? 0,
    feedback: body.feedback || "",
    aiReview: body.aiReview || {},
    followUpQa: Array.isArray(body.followUpQa) ? body.followUpQa : [],
    runOutput: body.runOutput || "",
    status: body.status || "submitted",
    attempts: attempts.length > 0 ? attempts : undefined,
  });
  await incrementDailyUserCount(userId, "codingInterviewsToday", "lastCodingInterviewDate");
  return res.status(201).json(new ApiResponse(201, session));
});

/** GET /api/v1/user/get-coding-interview - Get current user's coding interview sessions */
export const getCodingInterviews = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const sessions = await InterviewSession.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);
  return res.status(200).json(new ApiResponse(200, sessions));
});

/** PUT /api/v1/user/update-coding-interview/:id - Update session (owner only) */
export const updateCodingInterview = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const session = await InterviewSession.findOne({ _id: req.params.id, userId });
  if (!session) throw new ApiError(404, "Session not found");
  const body = req.body || {};
  const allowed = ["question", "code", "language", "score", "maxScore", "passed", "totalTests", "feedback", "aiReview", "followUpQa", "runOutput", "status"];
  allowed.forEach((key) => {
    if (body[key] !== undefined) session[key] = body[key];
  });
  await session.save();
  return res.status(200).json(new ApiResponse(200, session));
});

/** DELETE /api/v1/user/delete-coding-interview/:id - Delete session (owner only) */
export const deleteCodingInterview = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const session = await InterviewSession.findOneAndDelete({ _id: req.params.id, userId });
  if (!session) throw new ApiError(404, "Session not found");
  return res.status(200).json(new ApiResponse(200, { deleted: true }));
});
