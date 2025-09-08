
import { env } from "@/validations/env"
import nodemailer from "nodemailer"

// Create transporter (configure with your email provider)
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || "smtp.gmail.com",
  port: Number.parseInt(env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

transporter.verify().catch(console.error)

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const mailOptions: nodemailer.SendMailOptions = {
    from: `${env.SMTP_FROM}`,
    to: email,
    subject: "Verify Your Email Address",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          }
          .title {
            color: #1a202c;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
          }
          .subtitle {
            color: #718096;
            font-size: 16px;
            margin: 8px 0 0;
          }
          .code-container {
            background: #f7fafc;
            border: 2px dashed #e2e8f0;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 36px;
            font-weight: 700;
            color: #2d3748;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .code-label {
            color: #718096;
            font-size: 14px;
            margin-top: 10px;
          }
          .instructions {
            background: #ebf8ff;
            border-left: 4px solid #3182ce;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
          }
          .instructions h3 {
            color: #2c5282;
            margin: 0 0 10px;
            font-size: 16px;
          }
          .instructions ol {
            margin: 0;
            padding-left: 20px;
            color: #2d3748;
          }
          .instructions li {
            margin: 5px 0;
          }
          .security-notice {
            background: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
          }
          .security-notice h3 {
            color: #744210;
            margin: 0 0 10px;
            font-size: 16px;
            display: flex;
            align-items: center;
          }
          .security-notice p {
            color: #744210;
            margin: 0;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
          }
          .expiry {
            color: #e53e3e;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✉</div>
            <h1 class="title">Verify Your Email</h1>
            <p class="subtitle">Please use the code below to verify your email address</p>
          </div>

          <div class="code-container">
            <div class="code">${code}</div>
            <div class="code-label">Your 6-digit verification code</div>
          </div>

          <div class="instructions">
            <h3>📋 How to verify:</h3>
            <ol>
              <li>Return to the verification page</li>
              <li>Enter the 6-digit code above</li>
              <li>Click "Confirm Code" to complete verification</li>
            </ol>
          </div>

          <div class="security-notice">
            <h3>🔒 Security Notice</h3>
            <p>
              This code will expire in <span class="expiry">10 minutes</span>. 
              Never share this code with anyone. Our team will never ask for your verification code.
            </p>
          </div>

          <div class="footer">
            <p>
              If you didn't request this verification, please ignore this email.<br>
              This code was sent to <strong>${email}</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Verify Your Email Address
      
      Your verification code is: ${code}
      
      Please enter this code on the verification page to complete your email verification.
      
      This code will expire in 10 minutes.
      
      If you didn't request this verification, please ignore this email.
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (error) {
    return false
  }
  return true
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const mailOptions = {
    from: `"${env.APP_NAME || "Your App"}" <${env.SMTP_FROM || env.SMTP_USER}>`,
    to: email,
    subject: "Reset Your Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .link { font-size: 24px; font-weight: bold; color: #007bff; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the link below to reset your password:</p>
          <div class="link">
            <a href="${resetUrl}" style="color: #007bff;">Reset Password</a>
          </div>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (error) {
    throw new Error("Failed to send password reset email")
  }

  return true
}