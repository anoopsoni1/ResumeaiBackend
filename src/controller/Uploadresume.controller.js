import axios from "axios";
import mammoth, { extractRawText } from "mammoth";
import { uploadonCloudinary } from "../utils/cloudinary.js";
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
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) });

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


export const aiEditResume = Asynchandler(async (req, res) => {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const { resumeText } = req.body;

  if (!resumeText) {
    return res
      .status(400)
      .json({ success: false, message: "resumeText is required" });
  }

  const finalInstruction =
    "Rewrite this resume to be more professional, fix grammar, and make it ATS friendly. Keep all factual content but improve wording.";
   
  const prompt = `
You are a professional resume editor AI.
IMPORTANT:
i want you to return only the edited text not any other text.
Do not add asterisk or any other symbol in the beginning or end of the text.

Instruction: ${finalInstruction}

Resume:
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
 
  const editedText =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!editedText) {
    throw new ApiError(500, "Failed to get response from Gemini");
  }

  return res.json(
    new ApiResponse(200, { editedText }, "Resume edited successfully by AI")
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