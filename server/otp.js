const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true for port 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  
async function sendOtp(email) {
  const otp = Math.floor(100000 + Math.random() * 900000);
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for MaheMeet",
    text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
  });
  return otp;
}

module.exports = sendOtp;
