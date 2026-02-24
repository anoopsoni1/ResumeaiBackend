import "./loadEnv.js";
import { app } from "./app.js";
import { connectDB } from "./DB/index.js";

if (!process.env.RESEND_API_KEY) {
  console.warn("[Resend] RESEND_API_KEY not set in .env - forgot-password OTP emails will not be sent. Add your key from https://resend.com/api-keys");
}

connectDB().then(()=>{
 app.listen(process.env.PORT || 3000, ()=>{
 console.log(`Server is running at port ${process.env.PORT||3000} `);
})

}).catch("error")


