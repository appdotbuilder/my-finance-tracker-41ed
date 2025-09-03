import { db } from '../db';
import { usersTable } from '../db/schema';
import { type ResetPasswordInput } from '../schema';
import { eq, and, gt } from 'drizzle-orm';

export const resetPassword = async (input: ResetPasswordInput): Promise<{ message: string }> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.email, input.email),
        eq(usersTable.password_reset_token, input.token),
        gt(usersTable.password_reset_expires, new Date()) // Token must not be expired
      ))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid or expired password reset token.');
    }

    const user = users[0];

    // Hash the new password
    const passwordHash = await Bun.password.hash(input.new_password);

    await db.update(usersTable)
      .set({
        password_hash: passwordHash,
        password_reset_token: null, // Clear the token after use
        password_reset_expires: null, // Clear expiration after use
        updated_at: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .execute();

    return { message: 'Your password has been successfully reset.' };
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw error;
  }
};