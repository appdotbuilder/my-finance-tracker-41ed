import { db } from '../db';
import { transactionsTable, transactionCategoriesTable } from '../db/schema';
import { type GetCategorySpendingInput, type CategorySpending } from '../schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const getCategorySpending = async (input: GetCategorySpendingInput): Promise<CategorySpending[]> => {
  try {
    // Get aggregated spending data by category for the user within the date range
    const results = await db.select({
      category_id: transactionCategoriesTable.id,
      category_name: transactionCategoriesTable.name,
      total_amount: sql<string>`sum(${transactionsTable.amount})`,
      transaction_count: sql<string>`count(${transactionsTable.id})`
    })
    .from(transactionsTable)
    .innerJoin(
      transactionCategoriesTable,
      eq(transactionsTable.category_id, transactionCategoriesTable.id)
    )
    .where(
      and(
        eq(transactionsTable.user_id, input.user_id),
        gte(transactionsTable.transaction_date, input.period_start.toISOString().split('T')[0]),
        lte(transactionsTable.transaction_date, input.period_end.toISOString().split('T')[0]),
        eq(transactionsTable.type, 'expense') // Only expenses for spending analysis
      )
    )
    .groupBy(transactionCategoriesTable.id, transactionCategoriesTable.name)
    .execute();

    // Calculate total spending to determine percentages
    const totalSpending = results.reduce((sum, result) => 
      sum + parseFloat(result.total_amount), 0
    );

    // Transform results with numeric conversions and percentage calculations
    return results.map(result => ({
      category_id: result.category_id,
      category_name: result.category_name,
      total_amount: parseFloat(result.total_amount),
      transaction_count: parseInt(result.transaction_count),
      percentage_of_total: totalSpending > 0 
        ? (parseFloat(result.total_amount) / totalSpending) * 100 
        : 0
    }));
  } catch (error) {
    console.error('Category spending analysis failed:', error);
    throw error;
  }
};