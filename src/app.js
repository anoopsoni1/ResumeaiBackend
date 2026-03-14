import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import passport from "./config/passport.google.js";
// import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";

const app = express();

app.use(cors({
     origin :["http://localhost:5173","https://resume-ai-frontend-mj2p.vercel.app"],
    credentials: true
}))
app.use(passport.initialize());

app.use(express.json({ limit: "500kb" }))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use("/public", express.static("public"));
app.use(cookieParser());

// Rate limit all API requests (in-memory by default; Redis if REDIS_URL/REDIS_HOST set)
// app.use("/api/v1", rateLimitMiddleware);

import { router } from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";
import resumeRouter from "./routes/resume.routes.js";
// import { roadmapRouter } from "./routes/roadmap.routes.js";

app.use("/api/v1/user", router);
app.use("/api/v1/auth", authRouter);
app.use("/api/resume", resumeRouter);

export {app}