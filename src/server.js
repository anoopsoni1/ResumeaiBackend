import "./loadEnv.js";
import http from "http";
import { app } from "./app.js";
import { connectDB } from "./DB/index.js";

if (!process.env.RESEND_API_KEY) {
  console.warn("[Resend] RESEND_API_KEY not set in .env - forgot-password OTP emails will not be sent. Add your key from https://resend.com/api-keys");
}

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

connectDB().then(async () => {
  try {
    const { attachSocketServer } = await import("./socket/index.js");
    attachSocketServer(httpServer);
    console.log("Socket.IO + WebRTC signaling ready on same port");
  } catch {
    console.warn("[Socket] Not loaded. To enable: npm install socket.io");
  }
  httpServer.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
  });
}).catch((err) => {
  console.error("DB connection failed:", err);
});


