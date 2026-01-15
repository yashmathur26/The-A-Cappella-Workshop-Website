import axios from 'axios';

const BREVO_API_URL = 'https://api.brevo.com/v3';
const API_KEY = process.env.BREVO_API_KEY;

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