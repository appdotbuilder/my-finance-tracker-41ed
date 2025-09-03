import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let anotherUserId: number;
  let categoryId: number;
  let transactionId: number;

  beforeEach(async () => {
    // Create test users
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    const anotherUserResult = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password_hash: 'hashed_password',
        first_name: 'Another',
        last_name: 'User'
      })
      .returning()
      .execute();
    anotherUserId = anotherUserResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense',
        user_id: userId
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create a test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        amount: '50.00',
        description: 'Test transaction',
        type: 'expense',
        category_id: categoryId,
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    transactionId = transactionResult[0].id;
  });

  it('should successfully delete a transaction that belongs to the user', async () => {
    const result = await deleteTransaction(transactionId, userId);

    expect(result).toBe(true);

    // Verify the transaction was actually deleted from the database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should return false when trying to delete a non-existent transaction', async () => {
    const nonExistentId = 99999;
    const result = await deleteTransaction(nonExistentId, userId);

    expect(result).toBe(false);

    // Verify the original transaction still exists
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
  });

  it('should return false when trying to delete another users transaction', async () => {
    const result = await deleteTransaction(transactionId, anotherUserId);

    expect(result).toBe(false);

    // Verify the transaction still exists (wasn't deleted)
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toBe(userId); // Still belongs to original user
  });

  it('should only delete the specified transaction and not affect others', async () => {
    // Create another transaction for the same user
    const anotherTransactionResult = await db.insert(transactionsTable)
      .values({
        user_id: userId,
        amount: '25.00',
        description: 'Another transaction',
        type: 'income',
        category_id: categoryId,
        transaction_date: '2024-01-16'
      })
      .returning()
      .execute();
    const anotherTransactionId = anotherTransactionResult[0].id;

    // Delete the first transaction
    const result = await deleteTransaction(transactionId, userId);

    expect(result).toBe(true);

    // Verify only the targeted transaction was deleted
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const remainingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, anotherTransactionId))
      .execute();

    expect(deletedTransaction).toHaveLength(0);
    expect(remainingTransaction).toHaveLength(1);
    expect(remainingTransaction[0].description).toBe('Another transaction');
  });

  it('should handle deletion with invalid user id gracefully', async () => {
    const invalidUserId = -1;
    const result = await deleteTransaction(transactionId, invalidUserId);

    expect(result).toBe(false);

    // Verify the transaction still exists
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
  });
});