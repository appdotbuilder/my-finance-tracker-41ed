import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { type Budget } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getBudgets = async (userId: number): Promise<Budget[]> => {
  try {
    // Query budgets for the specific user, ordered by creation date (newest first)
    const result = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.user_id, userId))
      .orderBy(desc(budgetsTable.created_at))
      .execute();

    // Convert numeric and date fields back to proper types before returning
    return result.map(budget => ({
      ...budget,
      budget_amount: parseFloat(budget.budget_amount),
      start_date: new Date(budget.start_date),
      end_date: new Date(budget.end_date)
    }));
  } catch (error) {
    console.error('Budget retrieval failed:', error);
    throw error;
  }
};