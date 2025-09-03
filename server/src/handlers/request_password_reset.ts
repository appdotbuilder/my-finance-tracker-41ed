import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RequestPasswordResetInput } from '../schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const requestPasswordReset = async (input: RequestPasswordResetInput): Promise<{ message: string; token?: string }> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      // For security, do not reveal if the email does not exist
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const user = users[0];
    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token valid for 1 hour

    await db.update(usersTable)
      .set({
        password_reset_token: token,
        password_reset_expires: expires,
        updated_at: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .execute();

    // In a real application, you would send this token via email.
    // For this demo, we return the token directly.
    console.log(`Password reset token for ${user.email}: ${token}`);
    return { message: 'Password reset link simulated. Check console for token.', token: token };
  } catch (error) {
    console.error('Failed to request password reset:', error);
    throw error;
  }
};