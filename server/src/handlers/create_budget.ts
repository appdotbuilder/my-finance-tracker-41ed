import { db } from '../db';
import { budgetsTable, usersTable, transactionCategoriesTable } from '../db/schema';
import { type CreateBudgetInput, type Budget } from '../schema';
import { eq } from 'drizzle-orm';

export const createBudget = async (input: CreateBudgetInput): Promise<Budget> => {
  try {
    // Validate that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // If category_id is provided, validate that it exists and belongs to the user
    if (input.category_id !== null) {
      const categoryExists = await db.select()
        .from(transactionCategoriesTable)
        .where(eq(transactionCategoriesTable.id, input.category_id))
        .limit(1)
        .execute();

      if (categoryExists.length === 0) {
        throw new Error('Category not found');
      }

      if (categoryExists[0].user_id !== input.user_id) {
        throw new Error('Category does not belong to the specified user');
      }
    }

    // Validate date range
    if (input.start_date >= input.end_date) {
      throw new Error('Start date must be before end date');
    }

    // Insert budget record
    const result = await db.insert(budgetsTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        category_id: input.category_id,
        budget_amount: input.budget_amount.toString(), // Convert number to string for numeric column
        period_type: input.period_type,
        start_date: input.start_date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        end_date: input.end_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and dates back to Date objects before returning
    const budget = result[0];
    return {
      ...budget,
      budget_amount: parseFloat(budget.budget_amount), // Convert string back to number
      start_date: new Date(budget.start_date), // Convert string back to Date
      end_date: new Date(budget.end_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Budget creation failed:', error);
    throw error;
  }
};