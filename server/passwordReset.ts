import crypto from 'crypto';
import argon2 from 'argon2';
import { storage } from './storage';
import { sendPasswordResetEmail } from './brevo';

export async function generateResetToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

export async function initiatePasswordReset(email: string, baseUrl: string): Promise<boolean> {
  try {
    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether user exists - always return true
      return true;
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = await generateResetToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to database
    await storage.setPasswordResetToken(email, resetToken, expiry);

    // Generate reset URL
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email
    await sendPasswordResetEmail(email, resetToken, resetUrl);

    console.log(`🔐 Password reset initiated for ${email}`);
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    return false;
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // Validate token
    const user = await storage.validatePasswordResetToken(token);
    if (!user) {
      return { success: false, message: 'Invalid or expired reset token' };
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword);

    // Update password and clear reset token
    await storage.updatePassword(user.id, passwordHash);

    console.log(`🔑 Password reset successful for user ${user.email}`);
    return { success: true, message: 'Password reset successful' };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, message: 'Password reset failed' };
  }
}