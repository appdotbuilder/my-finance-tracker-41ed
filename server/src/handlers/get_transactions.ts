import { db } from '../db';
import { transactionsTable, transactionCategoriesTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTransactions = async (userId: number): Promise<Transaction[]> => {
  try {
    // Query transactions with category join for complete details
    const results = await db.select()
      .from(transactionsTable)
      .innerJoin(transactionCategoriesTable, eq(transactionsTable.category_id, transactionCategoriesTable.id))
      .where(eq(transactionsTable.user_id, userId))
      .orderBy(desc(transactionsTable.transaction_date))
      .execute();

    // Convert the joined results to Transaction objects with proper numeric conversions
    return results.map(result => ({
      id: result.transactions.id,
      user_id: result.transactions.user_id,
      amount: parseFloat(result.transactions.amount), // Convert numeric to number
      description: result.transactions.description,
      type: result.transactions.type,
      category_id: result.transactions.category_id,
      transaction_date: new Date(result.transactions.transaction_date), // Ensure proper date conversion
      created_at: result.transactions.created_at,
      updated_at: result.transactions.updated_at
    }));
  } catch (error) {
    console.error('Failed to get transactions:', error);
    throw error;
  }
};