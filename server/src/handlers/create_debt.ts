import { db } from '../db';
import { debtsTable, usersTable } from '../db/schema';
import { type CreateDebtInput, type Debt } from '../schema';
import { eq } from 'drizzle-orm';

export const createDebt = async (input: CreateDebtInput): Promise<Debt> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Insert debt record
    const result = await db.insert(debtsTable)
      .values({
        user_id: input.user_id,
        lender: input.lender,
        debt_type: input.debt_type,
        original_amount: input.original_amount.toString(), // Convert number to string for numeric column
        current_balance: input.current_balance.toString(), // Convert number to string for numeric column
        interest_rate: input.interest_rate.toString(), // Convert number to string for numeric column
        minimum_payment: input.minimum_payment.toString(), // Convert number to string for numeric column
        due_date: input.due_date ? input.due_date.toISOString().split('T')[0] : null // Convert Date to string or null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and date string back to Date before returning
    const debt = result[0];
    return {
      ...debt,
      original_amount: parseFloat(debt.original_amount), // Convert string back to number
      current_balance: parseFloat(debt.current_balance), // Convert string back to number
      interest_rate: parseFloat(debt.interest_rate), // Convert string back to number
      minimum_payment: parseFloat(debt.minimum_payment), // Convert string back to number
      due_date: debt.due_date ? new Date(debt.due_date) : null // Convert string back to Date or null
    };
  } catch (error) {
    console.error('Debt creation failed:', error);
    throw error;
  }
};