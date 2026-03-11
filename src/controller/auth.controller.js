/**
 * Google OAuth callback: generate JWT and redirect to frontend with token.
 * Frontend stores token and redirects to dashboard.
 */
import { Asynchandler } from "../utils/Asynchandler.js";
import { generateAccessAndRefereshTokens } from "./user.controller.js";
import { User } from "../models/User.model.js";

const FRONTEND_URL =   "https://resume-ai-frontend-mj2p.vercel.app";
// const API_BASE_URL =   "http:localhost:5000";

/**
 * GET /api/v1/auth/google/callback
 * Passport attaches req.user after successful Google login.
*/
export const googleCallback = Asynchandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    const errorUrl = `${FRONTEND_URL}/login?error=google_signin_failed`;
    return res.redirect(errorUrl);
  }

  try {
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken");

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    };
    res.cookie("accessToken", accessToken, cookieOptions);

    const redirectUrl = new URL(`${FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set("token", accessToken);
    redirectUrl.searchParams.set("user", encodeURIComponent(JSON.stringify(loggedInUser)));
    return res.redirect(redirectUrl.toString());
  } catch (err) {
    const errorUrl = `${FRONTEND_URL}/login?error=token_failed`;
    return res.redirect(errorUrl);
  }
});
