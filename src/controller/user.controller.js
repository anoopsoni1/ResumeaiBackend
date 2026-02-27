import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Resend } from "resend";

// Lazy: read at request time so dotenv has already run (imports run before dotenv.config() in server.js)
const getResend = () => (process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);
const OTP_EXPIRY_MINUTES = 10;
// Resend free tier: use "onboarding@resend.dev" (no display name) to avoid sender issues
const FROM_EMAIL = process.env.FORGOT_PASSWORD_FROM_EMAIL || "onboarding@resend.dev"; 


   const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const accessToken = jwt.sign(
          {user : user._id ,
            FirstName : user.FirstName,
            LastName : user.LastName ,
            email : user.email
          } ,
          process.env.ACCESS_TOKEN ,
          {
           expiresIn: process.env.ACCESS_TOKEN_EXPIRY
          }
        )
        
        const refreshToken = jwt.sign(
          {user : user._id} ,
          process.env.REFRESH_TOKEN ,
          {
           expiresIn: process.env.REFRESH_TOKEN_EXPIRY
          }
        )
 
        user.refreshtoken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (e) {
    //  console.error("Token generation error:", e.message);
    throw new ApiError(400 ,"Failed to generate tokens");
    }
};

const registeruser = Asynchandler(async(req ,res)=>{
   
  const {FirstName, LastName , email , password } = req.body 

      
  if(!FirstName?.trim()) throw new ApiError(400 , "Firstname is required")
 if(!LastName?.trim()) throw new ApiError(400 , "Lastname is required")
  if(!email?.trim()) throw new ApiError(400 ,  "Email is required")
  if(!password?.trim()) throw new ApiError(400 , "Password is required")

    const existeduser = await User.findOne({email : email})

    if(existeduser) throw new ApiError(400 , "user existed")

      const user = await User.create({
        FirstName ,
        LastName ,
        email ,
        password
      })

      const createduser =  await User.findById(user._id)

const newuser = await User.findById(createduser._id).select("-password -refreshtoken"); 

      if(!createduser) throw new ApiError(400 , "something went wrong") 

        return res.status(200).json(
            new ApiResponse(200 , newuser , "User registerd succesfully")
        )

})

const loginuser = Asynchandler(async(req ,res)=>{
   
       const {email , password} = req.body
 
      if(!email) throw new ApiError(400 , "Email is required")
      if(!password) throw new ApiError(400 , "Password is required")

      const user = await User.findOne({ email })

      if(!user) throw new ApiError(400 , "User does not exist")

      const isPasswordValid = await user.isPasswordCorrect(password);
      if (!isPasswordValid) {
        throw new ApiError(400, "Invalid email or password");
      }
   const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")
   const options = {
        httpOnly: true,
        // Don't block cookies on http://localhost during dev
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    }
       return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})
const logoutUser = Asynchandler(async(req, res) => {
   
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logged out" });
});

  const getCurrentUser = (req, res) => {
  const user = req.user; 
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  res.json({ user });
};


// Forgot password: generate OTP, save to user, send via Resend
const forgotPassword = Asynchandler(async (req, res) => {
    const { email } = req.body;
    const emailTrim = email?.trim();
    // console.log("[ForgotPassword] Request for email:", emailTrim || "(empty)");
    if (!emailTrim) throw new ApiError(400, "Email is required");
    const user = await User.findOne({ email: emailTrim });
    if (!user) {
        // console.log("[ForgotPassword] User not found:", emailTrim);
        throw new ApiError(404, "User not found");
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await User.findByIdAndUpdate(user._id, {
        $set: { forgotPasswordOtp: otp, forgotPasswordOtpExpiresAt: expiresAt },
    });
    const resend = getResend();
    if (!resend) {
        // console.error("[ForgotPassword] RESEND_API_KEY not set - cannot send OTP");
        throw new ApiError(503, "Email service not configured. Set RESEND_API_KEY in .env");
    }
    const fromAddress = FROM_EMAIL.trim() || "onboarding@resend.dev";
    const toAddress = user.email.trim();
    try {
        const result = await resend.emails.send({
            from: fromAddress,
            to: toAddress,
            subject: "Your password reset OTP - Resume AI",
            html: `<p>Your OTP to reset password is: <strong>${otp}</strong></p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.</p>`,
        });
        const { data, error } = result || {};
        if (error) {
            const errMsg = typeof error === "object" && error !== null ? (error.message || JSON.stringify(error)) : String(error);
            // console.error("[ForgotPassword] Resend error:", errMsg, "| full:", error);
            throw new ApiError(error.statusCode || 500, errMsg || "Failed to send OTP email.");
        }
        if (!data?.id) {
            console.warn("[ForgotPassword] Resend returned no id. Result:", result);
        }
        // console.log("[ForgotPassword] OTP email sent to", toAddress, "| Resend id:", data?.id);
    } catch (err) {
        // console.error("[ForgotPassword] Exception:", err?.message || err);
        const code = err.statuscode ?? err.statusCode ?? 500;
        const message = (code === 500 && err.message) ? err.message : "Failed to send OTP email. Check RESEND_API_KEY and Resend dashboard.";
        throw new ApiError(code, message);
    }
    return res.status(200).json(
        new ApiResponse(200, { message: "OTP sent to your email." }, "OTP sent successfully")
    );
});

// Verify forgot-password OTP; on success frontend can show new password form
const verifyForgotOtp = Asynchandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email?.trim()) throw new ApiError(400, "Email is required");
    if (!otp?.trim()) throw new ApiError(400, "OTP is required");
    const user = await User.findOne({ email: email.trim() });
    if (!user) throw new ApiError(404, "User not found");
    if (!user.forgotPasswordOtp || !user.forgotPasswordOtpExpiresAt) throw new ApiError(400, "OTP not found or expired. Request a new one.");
    if (new Date() > user.forgotPasswordOtpExpiresAt) throw new ApiError(400, "OTP expired. Request a new one.");
    if (user.forgotPasswordOtp !== String(otp).trim()) throw new ApiError(400, "Invalid OTP");
    return res.status(200).json(
        new ApiResponse(200, { message: "OTP verified. You can set a new password." }, "OTP verified")
    );
});

// Reset password after OTP verified: accept email, otp, newPassword; verify OTP again then update password
const resetPasswordAfterOtp = Asynchandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email?.trim()) throw new ApiError(400, "Email is required");
    if (!otp?.trim()) throw new ApiError(400, "OTP is required");
    if (!newPassword?.trim()) throw new ApiError(400, "New password is required");
    const user = await User.findOne({ email: email.trim() });
    if (!user) throw new ApiError(404, "User not found");
    if (!user.forgotPasswordOtp || !user.forgotPasswordOtpExpiresAt) throw new ApiError(400, "OTP not found or expired. Request a new one.");
    if (new Date() > user.forgotPasswordOtpExpiresAt) throw new ApiError(400, "OTP expired. Request a new one.");
    if (user.forgotPasswordOtp !== String(otp).trim()) throw new ApiError(400, "Invalid OTP");
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await User.findByIdAndUpdate(user._id, {
        $set: { password: hashedPassword },
        $unset: { forgotPasswordOtp: "", forgotPasswordOtpExpiresAt: "" },
    });
    return res.status(200).json(
        new ApiResponse(200, { message: "Password updated successfully. You can sign in with your new password." }, "Password reset successfully")
    );
});

const updateAccountDetails = Asynchandler(async (req, res) => {
    const { email, FirstName } = req.body
    if (!FirstName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { FirstName, email } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const makePremium = Asynchandler(async(req, res) => {
    const { userId } = req.body;
    const user = await User.findByIdAndUpdate(userId, { $set: { Premium: true } }, { new: true }).select("-password");
    return res.status(200).json(new ApiResponse(200, user, "User made premium successfully"));
});

const makeAdmin = Asynchandler(async(req, res) => {
    const { userId } = req.body;
    const user = await User.findByIdAndUpdate(userId, { $set: { isAdmin: true } }, { new: true }).select("-password");
    return res.status(200).json(new ApiResponse(200, user, "User made admin successfully"));
});
 
const getallusers = Asynchandler(async(req, res) => {
    const users = await User.find().select("-password");
    return res.status(200).json(new ApiResponse(200, users, "All users fetched successfully"));
});


export {
    registeruser,
    loginuser,
    logoutUser,
    getCurrentUser,
    updateAccountDetails,
    makePremium,
    makeAdmin,
    forgotPassword,
    verifyForgotOtp,
    resetPasswordAfterOtp,
    getallusers,
}