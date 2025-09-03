import { db } from '../db';
import { transactionsTable, usersTable, transactionCategoriesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Validate that user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Validate that category exists and belongs to the user
    const categories = await db.select()
      .from(transactionCategoriesTable)
      .where(and(
        eq(transactionCategoriesTable.id, input.category_id),
        eq(transactionCategoriesTable.user_id, input.user_id)
      ))
      .execute();

    if (categories.length === 0) {
      throw new Error('Category not found or does not belong to user');
    }

    const category = categories[0];

    // Validate that category type matches transaction type
    if (category.type !== input.type) {
      throw new Error(`Transaction type '${input.type}' does not match category type '${category.type}'`);
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        type: input.type,
        category_id: input.category_id,
        transaction_date: input.transaction_date.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount), // Convert string back to number
      transaction_date: new Date(transaction.transaction_date) // Convert string back to Date
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};