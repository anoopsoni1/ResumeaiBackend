import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "Resume AI <onboarding@resend.dev>";

/**
 * Send a greeting email to the user when they create/export a resume or portfolio.
 * @param {string} to - User's email
 * @param {string} userName - User's first name (or "there")
 * @param {"resume_upload" | "resume_export" | "portfolio_export"} type - Greeting type
 */
export async function sendGreetingEmail(to, userName = "there", type = "resume_upload") {
  if (!to || typeof to !== "string" || !to.includes("@")) return;
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email.service] RESEND_API_KEY not set, skipping greeting email");
    return;
  }

  const name = (userName || "there").trim() || "there";

  const subjects = {
    resume_upload: "Welcome – Your resume has been uploaded!",
    resume_export: "Your resume is ready to download",
    portfolio_export: "Your portfolio is ready!",
  };
  const subject = subjects[type] || subjects.resume_upload;

  const messages = {
    resume_upload: `
      <p>Hi ${name},</p>
      <p>Thank you for uploading your resume to Resume AI. We've extracted the text and you can now edit, optimize, and design your resume with our templates.</p>
      <p>Next steps:</p>
      <ul>
        <li>Add or edit your details in the dashboard</li>
        <li>Choose a resume design and customize it</li>
        <li>Export as PDF or DOCX when you're ready</li>
      </ul>
      <p>Good luck with your job search!</p>
      <p>— The Resume AI Team</p>
    `,
    resume_export: `
      <p>Hi ${name},</p>
      <p>Your resume has been exported successfully. Check your download and you're all set to send it to recruiters.</p>
      <p>Need changes? Log in anytime to edit and export again.</p>
      <p>— The Resume AI Team</p>
    `,
    portfolio_export: `
      <p>Hi ${name},</p>
      <p>Your portfolio has been generated successfully. Share the link or export it and showcase your work to the world.</p>
      <p>— The Resume AI Team</p>
    `,
  };
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Resume AI</h2>
      ${messages[type] || messages.resume_upload}
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("[email.service] Greeting send failed:", error.message);
      return;
    }
    console.log("[email.service] Greeting sent:", data?.id);
  } catch (err) {
    console.error("[email.service] Greeting email error:", err?.message || err);
  }
}
