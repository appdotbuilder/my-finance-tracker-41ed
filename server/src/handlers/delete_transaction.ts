import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteTransaction = async (transactionId: number, userId: number): Promise<boolean> => {
  try {
    // Delete the transaction, ensuring it belongs to the specified user
    const result = await db.delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, transactionId),
          eq(transactionsTable.user_id, userId)
        )
      )
      .execute();

    // Return true if a row was deleted, false otherwise
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
};