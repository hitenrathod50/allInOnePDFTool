// services/emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rathodhiten50@gmail.com",
    pass: "nvzt wjkh lipi ppjh" // use app password
  }
});

async function sendOtpEmail(to, otp) {

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validate your email</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width:600px; margin:20px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05); }
    .header { padding:30px 40px 20px; }
    .logo { font-size:28px; font-weight:700; color:#7100ad !important; text-decoration:none; }
    .content { padding:0 40px 30px; color:#374151; line-height:1.6; }
    h1 { font-size:24px; margin:0 0 20px 0; color:#111827; }
    .otp-box { background:#f8fafc; border:2px dashed #7100ad; border-radius:12px; padding:20px; margin:30px 0; text-align:center; font-size:32px; font-weight:700; letter-spacing:8px; color:#7100ad; }
    .footer { padding:10px 40px; text-align:center; color:#6b7280; font-size:14px; }
    hr { border:none; border-top:1px solid #e5e7eb; margin:10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="#" class="logo">HR TOOLS</a>
    </div>
    <div class="content">
      <h1>Validate your email</h1>
      <p>Hi,</p>
      <p>Thank you for creating an account in HR Tools. Please use the code below to validate your email address.</p>
      
      <div class="otp-box">${otp}</div>
      
      <p>If you didn't create a new account, please ignore this email.</p>
      <p>So long, and thanks for all the fish,</p>
      <p><strong>HR Tools Team</strong></p>
    </div>
    <hr>
    <div class="footer">
      <p>© 2026 HR Tools</p>
      <p>For any questions contact <a href="mailto:support@hrtools.net" style="color:#7100ad;">support@hrtools.net</a></p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: "rathodhiten50@gmail.com",
    to,
    subject: `Email Varification OTP`,
    html: htmlTemplate   // ← Important: use html instead of text
  });
}

module.exports = { sendOtpEmail }