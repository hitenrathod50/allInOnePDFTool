// services/emailService.js
const nodemailer = require("nodemailer");
const USER_NAME = "versatile.pdf.support@gmail.com";
const PASSWORD = "xtps vldd ytsb nlng";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: USER_NAME,
    pass: PASSWORD // use app password
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
      <a href="https://www.pdfversatile.com/" class="logo">PdfVersatile</a>
    </div>
    <div class="content">
      <h1>Validate your email</h1>
      <p>Hi,</p>
      <p>Thank you for creating an account in PdfVersatile. Please use the code below to validate your email address.</p>
      
      <div class="otp-box">${otp}</div>
      
      <p>If you didn't create a new account, please ignore this email.</p>
      <p>So long, and thanks for all the fish,</p>
      <p><strong>PdfVersatile Team</strong></p>
    </div>
    <hr>
    <div class="footer">
      <p>© 2026 PdfVersatile</p>
      <p>For any questions contact <a href="mailto:support@pdfversatile.com" style="color:#7100ad;">support@pdfversatile.com</a></p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"PdfVersatile" <versatile.pdf.support@gmail.com>`,
    to,
    subject: `Email Verification OTP`,
    html: htmlTemplate   // ← Important: use html instead of text
  });
}


async function contactFormSubmit(request, reply) {

  console.log("Contact form submitting here....")

  try {
    const { name, email, subject, message } = request.body;

    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Subject:", subject);
    console.log("Message:", message);

    // Validate input
    if (!name || !email || !subject || !message) {
      return reply.status(400).send({
        success: false,
        message: "All fields are required"
      });
    }

    // Mail options
    const mailOptions = {
      from: `"${name}" <versatile.pdf.support@gmail.com>`, // sender (user email)
      to: USER_NAME, // your email
      subject: subject,
      html: `
        <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Message</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width:600px; margin:20px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05); }
    .header { padding:30px 40px 20px; }
    .logo { font-size:28px; font-weight:700; color:#7100ad !important; text-decoration:none; }
    .content { padding:0 40px 30px; color:#374151; line-height:1.6; }
    h1 { font-size:24px; margin:0 0 20px 0; color:#111827; }
    .box { background:#f8fafc; border:2px dashed #7100ad; border-radius:12px; padding:20px; margin:30px 0; color:#111827; }
    .footer { padding:10px 40px; text-align:center; color:#6b7280; font-size:14px; }
    hr { border:none; border-top:1px solid #e5e7eb; margin:10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">PdfVersatile</span>
    </div>
    <div class="content">
      <h1>New Contact Message</h1>
      <p>You received a new message from your website contact form.</p>

      <div class="box">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br/> ${message}</p>
      </div>

      <p>Please respond to the user as soon as possible.</p>
      <p><strong>PdfVersatile System</strong></p>
    </div>
    <hr>
    <div class="footer">
      <p>© 2026 PdfVersatile</p>
      <p>Contact: support@pdfversatile.com</p>
    </div>
  </div>
</body>
</html>
      `
    };

    // Send mail
    await transporter.sendMail(mailOptions);

    return reply.status(200).send({
      success: true,
      message: "Email sent successfully"
    });

  } catch (error) {
    console.error("Email Error:", error);

    return reply.status(500).send({
      success: false,
      message: "Internal server error"
    });
  }
}

module.exports = { sendOtpEmail, contactFormSubmit }