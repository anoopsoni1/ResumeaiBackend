import axios from "axios";
import mammoth, { extractRawText } from "mammoth";
import { uploadonCloudinary } from "../utils/Cloudinary.js";
import cloudinary from "cloudinary";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { GoogleGenAI } from "@google/genai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import PDFDocument from "pdfkit";

export const UploadResume = Asynchandler(async (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }
  const cloudinaryRes = await uploadonCloudinary(req.file.path);
  if (!cloudinaryRes) {
    return res.status(500).json({
      success: false,
      message: "Cloudinary upload failed",
    });
  }
  const signedUrl = cloudinary.v2.utils.private_download_url(
    cloudinaryRes.public_id,
    cloudinaryRes.format,
    {
      resource_type: "raw",
      ocr: "adv_ocr" ,
      type: "upload",
      expires_at: Math.floor(Date.now() / 1000) + 300,
    }
  );

  let fileBuffer;

  try {
    const downloaded = await axios.get(signedUrl, {
      responseType: "arraybuffer",
    });

    fileBuffer = Buffer.from(downloaded.data);
  } catch (err) {
    console.log("Signed download error:", err.response?.status);
    return res.status(401).json({
      success: false,
      message: "Failed to download RAW file from Cloudinary",
    });
  }

  const fileType = req.file.mimetype;  
  

let extractedText = ""; 

try {
  if (fileType === "application/pdf") {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/standard_fonts/",
    });

        const pdf = await loadingTask.promise;
        
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items.map(item => item.str).join(" ");
        extractedText += pageText + "\n";
  }
  }

  else if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const doc = await mammoth.extractRawText({
      arrayBuffer: fileBuffer,
    });

    extractedText = doc.value || "";
  }


  else {
    return res.status(400).json({
      success: false,
      message: "Only PDF or DOCX files are supported",
    });
  }
} catch (err) {
  console.error("Extract error:", err);
  return res.status(500).json({
    success: false,
    message: "Failed to extract text from resume",
  });
}

  return res.json(
    new ApiResponse(
      200,
      {
        fileUrl: cloudinaryRes.secure_url,
        resumeText: extractedText,
      },
      "Resume uploaded & text extracted successfully"
    )
  );
});


/** Build plain resume text from structured detail (for backward compatibility / display). */
function detailToResumeText(d) {
  if (!d) return "";
  const lines = [];
  lines.push((d.name || "").trim() || "Your Name");
  lines.push((d.role || "").trim() || "Your Role");
  lines.push("");
  if ((d.summary || "").trim()) {
    lines.push("SUMMARY");
    lines.push(d.summary.trim());
    lines.push("");
  }
  if (Array.isArray(d.skills) && d.skills.length > 0) {
    const skillList = d.skills.map((s) => (s || "").trim()).filter(Boolean).join("\n");
    if (skillList) {
      lines.push("SKILLS");
      lines.push(skillList);
      lines.push("");
    }
  }
  if (Array.isArray(d.experience) && d.experience.length > 0) {
    lines.push("EXPERIENCE");
    d.experience.forEach((entry) => {
      if ((entry || "").trim()) lines.push(entry.trim());
      lines.push("");
    });
  }
  if (Array.isArray(d.projects) && d.projects.length > 0) {
    const projectTexts = d.projects.map((p) => (p || "").trim()).filter(Boolean);
    if (projectTexts.length) {
      lines.push("PROJECTS");
      projectTexts.forEach((p) => { lines.push(p); lines.push(""); });
    }
  }
  if ((d.education || "").trim()) {
    lines.push("EDUCATION");
    lines.push(d.education.trim());
    lines.push("");
  }
  if ((d.languageProficiency || "").trim()) {
    lines.push("LANGUAGE PROFICIENCY");
    lines.push(d.languageProficiency.trim());
    lines.push("");
  }
  const contact = [(d.email || "").trim(), (d.phone || "").trim()].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);
  return lines.join("\n").trim();
}

export const aiEditResume = Asynchandler(async (req, res) => {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const { resumeText } = req.body;

  if (!resumeText) {
    return res
      .status(400)
      .json({ success: false, message: "resumeText is required" });
  }

  const prompt = `You are a professional resume editor focused on ATS optimization. Parse the resume text below, improve it (grammar, spelling, quantify impact, strong action verbs, ATS keywords), and return a single JSON object with exactly these keys—no other keys, no markdown, no code fence:

- name (string): full name
- role (string): job title / professional role
- summary (string): professional summary (1–3 sentences)
- skills (array of strings): list of skills, one per element
- experience (array of strings): each element is one job entry as a single string with newlines, e.g. "Job Title\\nCompany Name\\n2020 – Present\\n• Bullet one\\n• Bullet two"
- projects (array of strings): each element one project description (can include newlines)
- education (string): education block
- languageProficiency (string): languages
- email (string): email address
- phone (string): phone number

Rules: Preserve all factual content. Fix grammar and spelling. Quantify impact where possible. Use strong action verbs. Return ONLY valid JSON. All string values must be properly escaped (e.g. newlines as \\n, quotes escaped).

Resume text to parse and improve:
${resumeText}`;

  const result = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  const raw =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!raw) {
    throw new ApiError(500, "Failed to get response from Gemini");
  }

  let optimizedDetail = null;
  let cleaned = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, "$1").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    optimizedDetail = {
      name: parsed.name != null ? String(parsed.name).trim() || "Your Name" : "Your Name",
      role: parsed.role != null ? String(parsed.role).trim() || "Your Role" : "Your Role",
      summary: parsed.summary != null ? String(parsed.summary).trim() : "",
      skills: Array.isArray(parsed.skills) ? parsed.skills.map((s) => String(s).trim()).filter(Boolean) : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience.map((e) => (e != null ? String(e).trim() : "")).filter(Boolean) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map((p) => (p != null ? String(p).trim() : "")).filter(Boolean) : [],
      education: parsed.education != null ? String(parsed.education).trim() : "",
      languageProficiency: parsed.languageProficiency != null ? String(parsed.languageProficiency).trim() : "",
      email: parsed.email != null ? String(parsed.email).trim() : "",
      phone: parsed.phone != null ? String(parsed.phone).trim() : "",
    };
  } catch (e) {
    console.error("Gemini optimize JSON parse error:", e, raw?.slice(0, 300));
    throw new ApiError(500, "AI returned invalid format; please try again.");
  }

  const editedText = detailToResumeText(optimizedDetail);

  return res.json(
    new ApiResponse(200, { editedText, optimizedDetail }, "Resume optimized successfully by AI")
  );
});

const TEMPLATE_CONFIG = {
  classic: { name: 40, heading: 26, body: 22 },
  modern: { name: 44, heading: 28, body: 22 },
  minimal: { name: 36, heading: 24, body: 20 },
};

const JOB_REGEX = /(developer|engineer|intern|designer|manager)/i;

export const exportResume = Asynchandler(async (req, res) => {
  const {
    resumeText,
    template = "modern",
    layout = "ats",
    format = "docx",
  } = req.body;

  if (!resumeText) {
    return res.status(400).json({ message: "resumeText required" });
  }

  const config = TEMPLATE_CONFIG[template];
  const lines = resumeText.split("\n").map(l => l.trim()).filter(Boolean);

  /* ================= DOCX ================= */
  if (format === "docx") {
    const children = [];

    lines.forEach((line, index) => {
      if (index === 0) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: config.name })],
        }));
        return;
      }

      if (["SUMMARY","SKILLS","EXPERIENCE","EDUCATION","PROJECTS"].includes(line.toUpperCase())) {
        children.push(new Paragraph({
          spacing: { before: 300 },
          children: [new TextRun({ text: line, bold: true, size: config.heading })],
        }));
        return;
      }

      const isJob = JOB_REGEX.test(line);

      children.push(new Paragraph({
        children: [new TextRun({
          text: line.replace(/^[-•]\s*/, ""),
          bold: isJob,
          size: config.body,
        })],
      }));
    });

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Disposition", "attachment; filename=Resume.docx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return res.send(buffer);
  }

  /* ================= PDF ================= */
  if (format === "pdf") {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Disposition", "attachment; filename=Resume.pdf");
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    lines.forEach((line, index) => {
      if (index === 0) {
        doc.fontSize(22).text(line, { underline: false });
        doc.moveDown();
        return;
      }

      if (["SUMMARY","SKILLS","EXPERIENCE","EDUCATION","PROJECTS"].includes(line.toUpperCase())) {
        doc.moveDown().fontSize(14).text(line, { underline: true });
        return;
      }

      const isJob = JOB_REGEX.test(line);
      doc.fontSize(11).font(isJob ? "Helvetica-Bold" : "Helvetica").text(line);
    });

    doc.end();
  }
});