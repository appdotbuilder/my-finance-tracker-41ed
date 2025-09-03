import { type CreateTransactionCategoryInput, type TransactionCategory } from '../schema';

export async function createTransactionCategory(input: CreateTransactionCategoryInput): Promise<TransactionCategory> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new transaction category for a user and persisting it in the database.
    // Should validate that the user exists and the category name is unique for that user.
    return Promise.resolve({
        id: 0,
        name: input.name,
        type: input.type,
        user_id: input.user_id,
        created_at: new Date()
    } as TransactionCategory);
}