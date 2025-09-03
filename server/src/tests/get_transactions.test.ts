import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable, transactionsTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';
import { eq } from 'drizzle-orm';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no transactions', async () => {
    // Create a user with no transactions
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const result = await getTransactions(userResult[0].id);

    expect(result).toEqual([]);
  });

  it('should return transactions for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Groceries',
        type: 'expense',
        user_id: userId
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test transactions
    const transactionDate1 = new Date('2023-01-01');
    const transactionDate2 = new Date('2023-01-02');
    
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          amount: '100.50',
          description: 'Grocery shopping',
          type: 'expense' as const,
          category_id: categoryId,
          transaction_date: '2023-01-01'
        },
        {
          user_id: userId,
          amount: '50.25',
          description: 'Weekly groceries',
          type: 'expense' as const,
          category_id: categoryId,
          transaction_date: '2023-01-02'
        }
      ])
      .execute();

    const result = await getTransactions(userId);

    expect(result).toHaveLength(2);
    
    // Verify transactions are sorted by transaction_date descending (most recent first)
    expect(result[0].transaction_date).toEqual(transactionDate2);
    expect(result[1].transaction_date).toEqual(transactionDate1);

    // Verify first transaction fields
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].amount).toEqual(50.25);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].description).toEqual('Weekly groceries');
    expect(result[0].type).toEqual('expense');
    expect(result[0].category_id).toEqual(categoryId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only return transactions for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const userId1 = user1Result[0].id;
    const userId2 = user2Result[0].id;

    // Create categories for both users
    const category1Result = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Food',
        type: 'expense',
        user_id: userId1
      })
      .returning()
      .execute();

    const category2Result = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Transportation',
        type: 'expense',
        user_id: userId2
      })
      .returning()
      .execute();

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId1,
          amount: '75.00',
          description: 'Restaurant meal',
          type: 'expense' as const,
          category_id: category1Result[0].id,
          transaction_date: '2023-01-01'
        },
        {
          user_id: userId2,
          amount: '25.50',
          description: 'Bus fare',
          type: 'expense' as const,
          category_id: category2Result[0].id,
          transaction_date: '2023-01-01'
        }
      ])
      .execute();

    // Get transactions for user1 only
    const result = await getTransactions(userId1);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId1);
    expect(result[0].description).toEqual('Restaurant meal');
    expect(result[0].amount).toEqual(75.00);
  });

  it('should handle different transaction types and amounts correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create categories for income and expense
    const expenseCategoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Utilities',
        type: 'expense',
        user_id: userId
      })
      .returning()
      .execute();

    const incomeCategoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Salary',
        type: 'income',
        user_id: userId
      })
      .returning()
      .execute();

    // Create transactions with different types and amounts
    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          amount: '1500.75',
          description: 'Monthly salary',
          type: 'income' as const,
          category_id: incomeCategoryResult[0].id,
          transaction_date: '2023-01-02'
        },
        {
          user_id: userId,
          amount: '89.99',
          description: 'Electric bill',
          type: 'expense' as const,
          category_id: expenseCategoryResult[0].id,
          transaction_date: '2023-01-01'
        }
      ])
      .execute();

    const result = await getTransactions(userId);

    expect(result).toHaveLength(2);
    
    // Verify income transaction (should be first due to more recent date)
    expect(result[0].type).toEqual('income');
    expect(result[0].amount).toEqual(1500.75);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].description).toEqual('Monthly salary');

    // Verify expense transaction
    expect(result[1].type).toEqual('expense');
    expect(result[1].amount).toEqual(89.99);
    expect(result[1].description).toEqual('Electric bill');
  });

  it('should verify transactions are saved to database correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense',
        user_id: userId
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test transaction
    await db.insert(transactionsTable)
      .values({
        user_id: userId,
        amount: '123.45',
        description: 'Test transaction',
        type: 'expense' as const,
        category_id: categoryId,
        transaction_date: '2023-01-01'
      })
      .execute();

    // Get transactions using the handler
    const handlerResult = await getTransactions(userId);

    // Verify directly from database
    const dbResult = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbResult).toHaveLength(1);
    expect(handlerResult[0].amount).toEqual(123.45);
    expect(parseFloat(dbResult[0].amount)).toEqual(123.45);
  });
});