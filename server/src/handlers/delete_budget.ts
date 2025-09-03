import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteBudget(budgetId: number, userId: number): Promise<boolean> {
  try {
    // Delete the budget, ensuring it belongs to the specified user
    const result = await db.delete(budgetsTable)
      .where(
        and(
          eq(budgetsTable.id, budgetId),
          eq(budgetsTable.user_id, userId)
        )
      )
      .execute();

    // Return true if exactly one row was deleted, false otherwise
    return result.rowCount === 1;
  } catch (error) {
    console.error('Budget deletion failed:', error);
    throw error;
  }
}