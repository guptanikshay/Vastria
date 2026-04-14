const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: `"Vastria" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your Vastria account",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAFAF9;">
        <h1 style="font-size: 28px; font-weight: 700; color: #2c2c2c; margin: 0 0 8px; text-align: center;">Vastria</h1>
        <p style="color: #6b6b6b; text-align: center; margin: 0 0 32px; font-size: 14px;">Your personal wardrobe assistant</p>
        <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e8e4de;">
          <p style="color: #2c2c2c; font-size: 15px; margin: 0 0 24px;">Here's your verification code:</p>
          <div style="text-align: center; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #8B7E74; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #6b6b6b; font-size: 13px; margin: 0; text-align: center;">This code expires in 5 minutes.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">If you didn't create a Vastria account, you can ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { generateCode, sendVerificationEmail };
