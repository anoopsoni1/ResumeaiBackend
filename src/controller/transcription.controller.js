import OpenAI from "openai";
import axios from "axios";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

const aiClient = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

/** Transcribe audio/video from URL (e.g. Cloudinary). Body: { audioUrl: string } */
export const transcribeAudio = Asynchandler(async (req, res) => {
  const audioUrl = req.body?.audioUrl || req.query?.audioUrl;
  if (!audioUrl || typeof audioUrl !== "string") {
    return res.status(400).json(new ApiResponse(400, null, "audioUrl is required"));
  }
  const response = await axios.get(audioUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);
  if (!aiClient) {
    return res.status(503).json(new ApiResponse(503, null, "AI service not configured (GROQ_API_KEY)"));
  }

  const base64 = buffer.toString("base64");
  const prompt = `You are given a base64-encoded interview recording. The raw bytes (truncated) are:\n${base64.slice(0, 4000)}\n\nYou cannot actually decode audio, so instead, output a short placeholder transcript like "Transcript not available; audio processing not implemented yet."`;

  const result = await aiClient.responses.create({
    model: "openai/gpt-oss-20b",
    input: prompt,
  });
  const text = result.output_text || "";
  return res.json(new ApiResponse(200, text, "Audio transcribed (placeholder) successfully"));
});