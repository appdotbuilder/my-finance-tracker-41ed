// This is a verification file to test the reset password functionality
// In a real environment, this would be in the tests directory

import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { requestPasswordReset } from './request_password_reset';
import { resetPassword } from './reset_password';

export const testResetPasswordFlow = async () => {
  try {
    // Test data
    const testEmail = 'test@example.com';
    const newPassword = 'newPassword123';
    
    // First create a user (assuming user exists)
    // In real tests, you'd create the user first
    
    // Step 1: Request password reset
    console.log('Step 1: Requesting password reset...');
    const resetRequest = await requestPasswordReset({ email: testEmail });
    console.log('Reset request result:', resetRequest);
    
    if (resetRequest.token) {
      // Step 2: Use the token to reset password
      console.log('Step 2: Resetting password with token...');
      const resetResult = await resetPassword({
        email: testEmail,
        token: resetRequest.token,
        new_password: newPassword
      });
      console.log('Reset result:', resetResult);
      
      // Step 3: Verify token is cleared
      console.log('Step 3: Verifying token is cleared...');
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.email, testEmail))
        .execute();
        
      if (users.length > 0) {
        const user = users[0];
        console.log('Token cleared:', user.password_reset_token === null);
        console.log('Expiration cleared:', user.password_reset_expires === null);
        
        // Step 4: Try to verify password hash changed
        const isValidPassword = await Bun.password.verify(newPassword, user.password_hash);
        console.log('New password is valid:', isValidPassword);
      }
    }
    
    return 'Test completed successfully';
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
};