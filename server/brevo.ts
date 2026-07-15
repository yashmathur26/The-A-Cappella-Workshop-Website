import axios from 'axios';
import nodemailer from 'nodemailer';

const BREVO_API_URL = 'https://api.brevo.com/v3';
const API_KEY = process.env.BREVO_API_KEY;

// Free Gmail SMTP transport (cheapest option — no third-party account, uses the
// workshop's own Gmail). Requires GMAIL_USER + GMAIL_APP_PASSWORD (a Google
// "App Password", which needs 2-Step Verification enabled on that account).
let cachedGmailTransport: nodemailer.Transporter | null = null;
function getGmailTransport(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!cachedGmailTransport) {
    cachedGmailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return cachedGmailTransport;
}

// The Brevo-authenticated sending domain — mail from here is DKIM/SPF/DMARC
// aligned and reaches the inbox.
const AUTHENTICATED_SENDER = "noreply@theacappellaworkshop.com";

// Free mailbox providers can't be DKIM-authenticated through Brevo, so a sender
// at one of these forces Brevo onto its shared brevosend.com domain and gets
// verification codes blocked at Yahoo / spam-filed at Gmail.
const FREE_MAILBOX_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com",
  "outlook.com", "live.com", "aol.com", "icloud.com", "me.com", "msn.com",
]);

// Resolve the From address, ignoring a misconfigured free-mailbox sender (e.g. a
// leftover BREVO_SENDER_EMAIL=...@gmail.com in the host env) so we always send
// from the authenticated domain without needing a dashboard/env change.
function resolveSenderEmail(): string {
  const raw = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!raw) return AUTHENTICATED_SENDER;
  const domain = raw.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || FREE_MAILBOX_DOMAINS.has(domain)) return AUTHENTICATED_SENDER;
  return raw;
}

interface EmailParams {
  to: string;
  templateId: number;
  params: Record<string, any>;
}

export async function sendBrevoEmail({ to, templateId, params }: EmailParams): Promise<boolean> {
  if (!API_KEY) {
    console.warn("BREVO_API_KEY is not set; skipping email send.");
    return false;
  }
  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      {
        to: [{ email: to }],
        templateId: templateId,
        params: params
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );
    
    console.log(`✅ Email sent successfully to ${to} using template ${templateId}`);
    return true;
  } catch (error) {
    console.error('❌ Brevo email error:', error);
    return false;
  }
}

// Raw transactional email (inline subject + HTML). Uses the Brevo API (via
// BREVO_API_KEY) as the primary transport; only falls back to Gmail SMTP if
// Brevo isn't configured or fails. Returns false if nothing succeeds.
export async function sendRawEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<boolean> {
  const senderName = process.env.BREVO_SENDER_NAME || "The A Cappella Workshop";
  const senderEmail = resolveSenderEmail();

  // 1) Brevo API (preferred — uses BREVO_API_KEY).
  if (API_KEY) {
    try {
      await axios.post(
        `${BREVO_API_URL}/smtp/email`,
        {
          sender: { email: senderEmail, name: senderName },
          to: [{ email: to }],
          subject,
          htmlContent,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "api-key": API_KEY,
          },
        },
      );
      console.log(`✅ Raw email sent via Brevo to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Brevo raw email error (falling back to Gmail if configured):", error);
    }
  }

  // 2) Gmail SMTP fallback (only if GMAIL_USER + GMAIL_APP_PASSWORD are set).
  const gmail = getGmailTransport();
  if (gmail) {
    try {
      await gmail.sendMail({
        from: `${senderName} <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
      });
      console.log(`✅ Raw email sent via Gmail SMTP to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Gmail SMTP error:", error);
    }
  }

  console.warn(
    "No email transport succeeded; set BREVO_API_KEY (preferred) or GMAIL_USER + GMAIL_APP_PASSWORD.",
  );
  return false;
}

// Balance-lookup verification code
export async function sendBalanceVerificationCode(
  email: string,
  code: string,
): Promise<boolean> {
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 8px">Your verification code</h2>
      <p style="color:#475569;margin:0 0 20px">Enter this code on the Pay Remaining Balance page to view your balance.</p>
      <div style="font-size:34px;font-weight:700;letter-spacing:8px;background:#f1f5f9;border-radius:12px;padding:16px 0;text-align:center">${code}</div>
      <p style="color:#94a3b8;font-size:13px;margin:20px 0 0">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
    </div>`;
  return sendRawEmail(
    email,
    `Your A Cappella Workshop code: ${code}`,
    html,
  );
}

// Password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string) {
  return sendBrevoEmail({
    to: email,
    templateId: 2, // Reset Password template
    params: {
      RESET_URL: resetUrl,
      RESET_TOKEN: resetToken,
      EMAIL: email
    }
  });
}

// Registration confirmation email
export async function sendRegistrationConfirmationEmail(
  parentEmail: string, 
  parentName: string, 
  studentName: string, 
  weekLabel: string, 
  amountPaid: string,
  receiptDetails: any
) {
  return sendBrevoEmail({
    to: parentEmail,
    templateId: 1, // Registration Confirmation template
    params: {
      PARENT_NAME: parentName,
      STUDENT_NAME: studentName,
      WEEK_LABEL: weekLabel,
      AMOUNT_PAID: amountPaid,
      RECEIPT_URL: receiptDetails.receipt_url || '',
      PAYMENT_DATE: new Date().toLocaleDateString(),
      CAMP_DETAILS: `${studentName} is registered for ${weekLabel}`
    }
  });
}

// Admin notification email
export async function sendAdminNotificationEmail(
  parentName: string,
  studentName: string,
  weekLabel: string,
  amountPaid: string,
  parentEmail: string
) {
  return sendBrevoEmail({
    to: 'theacappellaworkshop@gmail.com',
    templateId: 1, // Can use same template or create an admin-specific one
    params: {
      PARENT_NAME: `Admin Notification: ${parentName}`,
      STUDENT_NAME: studentName,
      WEEK_LABEL: weekLabel,
      AMOUNT_PAID: amountPaid,
      PARENT_EMAIL: parentEmail,
      PAYMENT_DATE: new Date().toLocaleDateString(),
      CAMP_DETAILS: `New registration: ${studentName} for ${weekLabel} - Parent: ${parentName} (${parentEmail})`
    }
  });
}