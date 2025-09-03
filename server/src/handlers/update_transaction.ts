import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // First, check if the transaction exists
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString();
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.transaction_date !== undefined) {
      updateData.transaction_date = input.transaction_date;
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount),
      transaction_date: new Date(transaction.transaction_date),
      created_at: new Date(transaction.created_at),
      updated_at: new Date(transaction.updated_at)
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};