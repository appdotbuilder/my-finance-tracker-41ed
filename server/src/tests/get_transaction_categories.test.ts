import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable } from '../db/schema';
import { type CreateTransactionCategoryInput } from '../schema';
import { getTransactionCategories } from '../handlers/get_transaction_categories';

describe('getTransactionCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no categories', async () => {
    // Create a user first
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

    const result = await getTransactionCategories(userId);

    expect(result).toEqual([]);
  });

  it('should return categories for specific user only', async () => {
    // Create two users
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

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create categories for both users
    await db.insert(transactionCategoriesTable)
      .values([
        {
          name: 'User 1 Income',
          type: 'income',
          user_id: user1Id
        },
        {
          name: 'User 1 Expense',
          type: 'expense',
          user_id: user1Id
        },
        {
          name: 'User 2 Income',
          type: 'income',
          user_id: user2Id
        }
      ])
      .execute();

    // Get categories for user 1
    const user1Categories = await getTransactionCategories(user1Id);

    expect(user1Categories).toHaveLength(2);
    expect(user1Categories.every(cat => cat.user_id === user1Id)).toBe(true);
    expect(user1Categories.map(cat => cat.name)).toEqual(['User 1 Income', 'User 1 Expense']);

    // Get categories for user 2
    const user2Categories = await getTransactionCategories(user2Id);

    expect(user2Categories).toHaveLength(1);
    expect(user2Categories[0].user_id).toBe(user2Id);
    expect(user2Categories[0].name).toBe('User 2 Income');
  });

  it('should return categories sorted by type and name', async () => {
    // Create a user
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

    // Create multiple categories in random order
    await db.insert(transactionCategoriesTable)
      .values([
        {
          name: 'Utilities',
          type: 'expense',
          user_id: userId
        },
        {
          name: 'Salary',
          type: 'income',
          user_id: userId
        },
        {
          name: 'Food',
          type: 'expense',
          user_id: userId
        },
        {
          name: 'Freelance',
          type: 'income',
          user_id: userId
        },
        {
          name: 'Entertainment',
          type: 'expense',
          user_id: userId
        }
      ])
      .execute();

    const result = await getTransactionCategories(userId);

    expect(result).toHaveLength(5);

    // Check sorting: income categories first (alphabetically), then expense categories (alphabetically)
    const expectedOrder = [
      'Freelance',     // income
      'Salary',        // income
      'Entertainment', // expense
      'Food',          // expense
      'Utilities'      // expense
    ];

    expect(result.map(cat => cat.name)).toEqual(expectedOrder);

    // Verify types are grouped correctly
    const expenseCategories = result.filter(cat => cat.type === 'expense');
    const incomeCategories = result.filter(cat => cat.type === 'income');

    expect(expenseCategories).toHaveLength(3);
    expect(incomeCategories).toHaveLength(2);

    // All income categories should come before expense categories in the sorted result
    const firstExpenseIndex = result.findIndex(cat => cat.type === 'expense');
    const lastIncomeIndex = result.map(cat => cat.type).lastIndexOf('income');

    expect(lastIncomeIndex).toBeLessThan(firstExpenseIndex);
  });

  it('should include all required fields in returned categories', async () => {
    // Create a user
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

    // Create a category
    await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'income',
        user_id: userId
      })
      .execute();

    const result = await getTransactionCategories(userId);

    expect(result).toHaveLength(1);

    const category = result[0];
    expect(category.id).toBeDefined();
    expect(typeof category.id).toBe('number');
    expect(category.name).toBe('Test Category');
    expect(category.type).toBe('income');
    expect(category.user_id).toBe(userId);
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for non-existent user', async () => {
    const nonExistentUserId = 99999;

    const result = await getTransactionCategories(nonExistentUserId);

    expect(result).toEqual([]);
  });
});