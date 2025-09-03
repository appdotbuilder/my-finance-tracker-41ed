import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable, transactionCategoriesTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq, and } from 'drizzle-orm';

describe('createTransaction', () => {
  let testUserId: number;
  let testCategoryId: number;
  let expenseCategoryId: number;

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

    // Create test categories for both income and expense
    const incomeCategory = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Salary',
        type: 'income',
        user_id: testUserId
      })
      .returning()
      .execute();
    testCategoryId = incomeCategory[0].id;

    const expenseCategory = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Groceries',
        type: 'expense',
        user_id: testUserId
      })
      .returning()
      .execute();
    expenseCategoryId = expenseCategory[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateTransactionInput = {
    user_id: 0, // Will be set in tests
    amount: 150.75,
    description: 'Monthly salary payment',
    type: 'income',
    category_id: 0, // Will be set in tests
    transaction_date: new Date('2024-01-15')
  };

  it('should create a transaction successfully', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await createTransaction(input);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Monthly salary payment');
    expect(result.type).toEqual('income');
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.transaction_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };

    const result = await createTransaction(input);

    // Verify transaction was saved to database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    expect(savedTransaction.user_id).toEqual(testUserId);
    expect(parseFloat(savedTransaction.amount)).toEqual(150.75);
    expect(savedTransaction.description).toEqual('Monthly salary payment');
    expect(savedTransaction.type).toEqual('income');
    expect(savedTransaction.category_id).toEqual(testCategoryId);
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
    expect(savedTransaction.updated_at).toBeInstanceOf(Date);
  });

  it('should create expense transaction successfully', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: expenseCategoryId,
      type: 'expense' as const,
      description: 'Weekly grocery shopping',
      amount: 85.50
    };

    const result = await createTransaction(input);

    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(85.50);
    expect(result.description).toEqual('Weekly grocery shopping');
    expect(result.category_id).toEqual(expenseCategoryId);
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...testInput,
      user_id: 99999, // Non-existent user
      category_id: testCategoryId
    };

    await expect(createTransaction(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: 99999 // Non-existent category
    };

    await expect(createTransaction(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Other',
        last_name: 'User'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    // Create category for other user
    const otherCategoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Other Category',
        type: 'income',
        user_id: otherUserId
      })
      .returning()
      .execute();
    const otherCategoryId = otherCategoryResult[0].id;

    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: otherCategoryId // Category belongs to different user
    };

    await expect(createTransaction(input)).rejects.toThrow(/category not found or does not belong to user/i);
  });

  it('should throw error when transaction type does not match category type', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId, // Income category
      type: 'expense' as const // But trying to create expense transaction
    };

    await expect(createTransaction(input)).rejects.toThrow(/transaction type 'expense' does not match category type 'income'/i);
  });

  it('should handle large monetary amounts correctly', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId,
      amount: 1234567.89,
      description: 'Large income transaction'
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(1234567.89);
    expect(typeof result.amount).toBe('number');

    // Verify precision is maintained in database
    const savedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(savedTransaction[0].amount)).toEqual(1234567.89);
  });

  it('should handle transactions with future dates', async () => {
    const futureDate = new Date('2025-12-31');
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId,
      transaction_date: futureDate
    };

    const result = await createTransaction(input);

    expect(result.transaction_date).toEqual(futureDate);
  });
});