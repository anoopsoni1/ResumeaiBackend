// Load .env before any other app code runs (ES modules run imports first, so this must be imported first in server.js)
import dotenv from "dotenv";
dotenv.config();
