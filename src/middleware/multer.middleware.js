import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Public folder next to Backend/src (i.e. Backend/public), same place regardless of cwd
const publicDir = path.join(__dirname, "..", "public");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    cb(null, publicDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });

/** Use for interview recording uploads: accept video/audio, generous size, no default reject. */
export const uploadRecording = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const m = file.mimetype || "";
    const ok =
      !m ||
      m.startsWith("video/") ||
      m.startsWith("audio/") ||
      m === "application/octet-stream";
    cb(null, !!ok);
  },
});