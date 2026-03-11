/**
 * Passport Google OAuth 2.0 strategy.
 * Used for "Sign in with Google" — redirects to Google consent, then callback with profile.
 */
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.model.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// No trailing slash — must match exactly what you add in Google Console
const API_BASE = ("https://resumeaibackend-oqcl.onrender.com").replace(/\/$/, "");
const GOOGLE_CALLBACK_PATH = "/api/v1/auth/google/callback";
const callbackURL = `${API_BASE}${GOOGLE_CALLBACK_PATH}`;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("[Passport] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing. Google login will be disabled.");
} else {
  console.log("[Passport] Google callback URL (add this exact URI in Google Console):", callbackURL);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || "dummy",
      clientSecret: GOOGLE_CLIENT_SECRET || "dummy",
      callbackURL,
      scope: ["profile", "email"],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile?.emails?.[0]?.value;
        const googleId = profile?.id;
        const name = profile?.displayName || profile?.name;
        const givenName = profile?.name?.givenName || name?.split(" ")[0] || "User";
        const familyName = profile?.name?.familyName || name?.split(" ").slice(1).join(" ") || " ";

        if (!email || !googleId) {
          return done(new Error("Google profile missing email or id"), null);
        }

        let user = await User.findOne({ googleId });
        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ email });
        if (user) {
          user.googleId = googleId;
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        user = await User.create({
          FirstName: givenName,
          LastName: familyName || givenName,
          email,
          googleId,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password -refreshtoken");
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
