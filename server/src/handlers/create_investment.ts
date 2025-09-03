import { db } from '../db';
import { investmentsTable, usersTable } from '../db/schema';
import { type CreateInvestmentInput, type Investment } from '../schema';
import { eq } from 'drizzle-orm';

export const createInvestment = async (input: CreateInvestmentInput): Promise<Investment> => {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Insert investment record
    const result = await db.insert(investmentsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        type: input.type,
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        purchase_price: input.purchase_price.toString(), // Convert number to string for numeric column
        current_value: input.current_value.toString(), // Convert number to string for numeric column
        purchase_date: input.purchase_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and date back to Date object before returning
    const investment = result[0];
    return {
      ...investment,
      quantity: parseFloat(investment.quantity), // Convert string back to number
      purchase_price: parseFloat(investment.purchase_price), // Convert string back to number
      current_value: parseFloat(investment.current_value), // Convert string back to number
      purchase_date: new Date(investment.purchase_date) // Convert string back to Date object
    };
  } catch (error) {
    console.error('Investment creation failed:', error);
    throw error;
  }
};