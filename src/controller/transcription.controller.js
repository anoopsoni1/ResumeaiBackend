import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/** Transcribe audio/video from URL (e.g. Cloudinary). Body: { audioUrl: string } */
export const transcribeAudio = Asynchandler(async (req, res) => {
  const audioUrl = req.body?.audioUrl || req.query?.audioUrl;
  if (!audioUrl || typeof audioUrl !== "string") {
    return res.status(400).json(new ApiResponse(400, null, "audioUrl is required"));
  }
  const response = await axios.get(audioUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const mimeType = (response.headers["content-type"] || "video/mp4").split(";")[0].trim();
  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: mimeType.includes("video") ? mimeType : "audio/webm",
      },
    },
    "Transcribe this interview recording accurately. Include both interviewer and candidate speech.",
  ]);
  const text = result.response.text();
  return res.json(new ApiResponse(200, text, "Audio transcribed successfully"));
});