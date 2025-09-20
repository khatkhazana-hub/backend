// utils/mailer.js
const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

exports.sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Admin Support" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("📧 Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("sendMail error:", err);
    throw new Error("Failed to send email.");
  }
};
