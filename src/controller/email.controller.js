import { Resend } from "resend";
import { Asynchandler } from "../utils/Asynchandler.js";

const resend = new Resend(process.env.RESEND_API_KEY);

const Mail = Asynchandler(async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Send email via Resend API
    const response = await resend.emails.send({
      from: "Resume AI  <onboarding@resend.dev>", // your verified sender
      to: process.env.EMAIL_USER, // recipient
      subject: `New Contact from ${name}`,
      html: `
        <h2>Contact Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    });

    console.log("Email sent via Resend:", response.id);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Email sending failed:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default Mail;
