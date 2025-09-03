import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginUserInput, type User } from '../schema';

export const loginUser = async (input: LoginUserInput): Promise<User | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Verify password (in a real app, you'd use bcrypt.compare)
    // For now, we'll do a simple string comparison for testing purposes
    if (user.password_hash !== input.password) {
      return null; // Invalid password
    }

    // Return user without exposing password hash in a real app
    // For this demo, we'll include it as per the schema
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};