import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  let testUserId: number;
  let testCategoryId: number;
  let testTransactionId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Food',
        type: 'expense',
        user_id: testUserId
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        amount: '100.00',
        description: 'Original description',
        type: 'expense',
        category_id: testCategoryId,
        transaction_date: '2024-01-15'
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;
  });

  afterEach(resetDB);

  it('should update transaction amount', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 150.75
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toEqual('number');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction description', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      description: 'Updated description'
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.description).toEqual('Updated description');
    expect(result.amount).toEqual(100); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction type', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      type: 'income'
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(100); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction category', async () => {
    // Create another category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Entertainment',
        type: 'expense',
        user_id: testUserId
      })
      .returning()
      .execute();
    const newCategoryId = categoryResult[0].id;

    const input: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: newCategoryId
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.category_id).toEqual(newCategoryId);
    expect(result.amount).toEqual(100); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction date', async () => {
    const newDate = new Date('2024-02-20');
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      transaction_date: newDate
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.transaction_date).toEqual(newDate);
    expect(result.amount).toEqual(100); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 250.99,
      description: 'Multi-field update',
      type: 'income',
      transaction_date: new Date('2024-03-10')
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.amount).toEqual(250.99);
    expect(typeof result.amount).toEqual('number');
    expect(result.description).toEqual('Multi-field update');
    expect(result.type).toEqual('income');
    expect(result.transaction_date).toEqual(new Date('2024-03-10'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated transaction to database', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 75.50,
      description: 'Database verification test'
    };

    await updateTransaction(input);

    // Verify the changes were saved to database
    const savedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();

    expect(savedTransaction).toHaveLength(1);
    expect(parseFloat(savedTransaction[0].amount)).toEqual(75.50);
    expect(savedTransaction[0].description).toEqual('Database verification test');
    expect(savedTransaction[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 99.99
    };

    // Get the original updated_at timestamp
    const originalTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();
    const originalUpdatedAt = originalTransaction[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await updateTransaction(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent transaction', async () => {
    const input: UpdateTransactionInput = {
      id: 99999,
      amount: 100.00
    };

    await expect(updateTransaction(input)).rejects.toThrow(/Transaction with id 99999 not found/i);
  });

  it('should handle foreign key constraint for invalid category_id', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: 99999 // Non-existent category
    };

    await expect(updateTransaction(input)).rejects.toThrow();
  });

  it('should not update fields that are not provided', async () => {
    // Get original transaction
    const originalTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();

    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 200.00 // Only updating amount
    };

    const result = await updateTransaction(input);

    // Check that other fields remained unchanged
    expect(result.description).toEqual(originalTransaction[0].description);
    expect(result.type).toEqual(originalTransaction[0].type);
    expect(result.category_id).toEqual(originalTransaction[0].category_id);
    expect(result.transaction_date).toEqual(new Date(originalTransaction[0].transaction_date));
    expect(result.created_at).toEqual(new Date(originalTransaction[0].created_at));
    expect(result.user_id).toEqual(originalTransaction[0].user_id);
  });
});