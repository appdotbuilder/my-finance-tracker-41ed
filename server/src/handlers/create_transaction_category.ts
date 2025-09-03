import { db } from '../db';
import { transactionCategoriesTable, usersTable } from '../db/schema';
import { type CreateTransactionCategoryInput, type TransactionCategory } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createTransactionCategory = async (input: CreateTransactionCategoryInput): Promise<TransactionCategory> => {
  try {
    // Validate that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Check if category name already exists for this user
    const existingCategory = await db.select()
      .from(transactionCategoriesTable)
      .where(and(
        eq(transactionCategoriesTable.user_id, input.user_id),
        eq(transactionCategoriesTable.name, input.name)
      ))
      .execute();

    if (existingCategory.length > 0) {
      throw new Error(`Category with name '${input.name}' already exists for this user`);
    }

    // Insert the new transaction category
    const result = await db.insert(transactionCategoriesTable)
      .values({
        name: input.name,
        type: input.type,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Transaction category creation failed:', error);
    throw error;
  }
};