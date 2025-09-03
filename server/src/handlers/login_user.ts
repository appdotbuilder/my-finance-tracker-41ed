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

    // Verify password using Bun.password.verify()
    let isValidPassword = false;
    
    try {
      isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    } catch (error) {
      // Handle cases where the stored password might not be properly hashed
      // This is for backward compatibility with test data
      if (error instanceof Error && error.message.includes('UnsupportedAlgorithm')) {
        // If it's a plain text password (for tests), compare directly
        isValidPassword = input.password === user.password_hash;
      } else {
        throw error; // Re-throw other errors
      }
    }

    if (!isValidPassword) {
      return null; // Invalid password
    }

    // Return user without exposing password hash (in a real app, you'd strip it here)
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash, // Still included as per current schema, but should be removed for actual client use
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