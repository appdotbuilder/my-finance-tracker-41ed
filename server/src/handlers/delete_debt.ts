import { db } from '../db';
import { debtsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteDebt = async (debtId: number, userId: number): Promise<boolean> => {
  try {
    // Delete the debt record, ensuring it belongs to the user
    const result = await db.delete(debtsTable)
      .where(
        and(
          eq(debtsTable.id, debtId),
          eq(debtsTable.user_id, userId)
        )
      )
      .returning({ id: debtsTable.id })
      .execute();

    // Return true if a record was deleted, false otherwise
    return result.length > 0;
  } catch (error) {
    console.error('Debt deletion failed:', error);
    throw error;
  }
};