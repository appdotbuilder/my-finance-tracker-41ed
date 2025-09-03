import { db } from '../db';
import { transactionCategoriesTable } from '../db/schema';
import { type TransactionCategory } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getTransactionCategories = async (userId: number): Promise<TransactionCategory[]> => {
  try {
    // Query categories for the specified user, sorted by type and name
    const results = await db.select()
      .from(transactionCategoriesTable)
      .where(eq(transactionCategoriesTable.user_id, userId))
      .orderBy(
        asc(transactionCategoriesTable.type),
        asc(transactionCategoriesTable.name)
      )
      .execute();

    // Return the categories (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch transaction categories:', error);
    throw error;
  }
};