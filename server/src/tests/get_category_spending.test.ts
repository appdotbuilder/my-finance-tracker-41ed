import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable, transactionsTable } from '../db/schema';
import { type GetCategorySpendingInput } from '../schema';
import { getCategorySpending } from '../handlers/get_category_spending';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User'
};

const testCategories = [
  { name: 'Food', type: 'expense' as const },
  { name: 'Transport', type: 'expense' as const },
  { name: 'Entertainment', type: 'expense' as const },
  { name: 'Salary', type: 'income' as const }
];

describe('getCategorySpending', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return spending breakdown by category', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test categories
    const categories = await db.insert(transactionCategoriesTable)
      .values(testCategories.map(cat => ({ ...cat, user_id: user.id })))
      .returning()
      .execute();

    const foodCategory = categories.find(c => c.name === 'Food')!;
    const transportCategory = categories.find(c => c.name === 'Transport')!;
    const salaryCategory = categories.find(c => c.name === 'Salary')!;

    // Create test transactions
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user.id,
          amount: '100.00',
          description: 'Grocery shopping',
          type: 'expense',
          category_id: foodCategory.id,
          transaction_date: '2024-01-15'
        },
        {
          user_id: user.id,
          amount: '150.00',
          description: 'Restaurant dinner',
          type: 'expense',
          category_id: foodCategory.id,
          transaction_date: '2024-01-20'
        },
        {
          user_id: user.id,
          amount: '50.00',
          description: 'Bus pass',
          type: 'expense',
          category_id: transportCategory.id,
          transaction_date: '2024-01-10'
        },
        {
          user_id: user.id,
          amount: '3000.00',
          description: 'Monthly salary',
          type: 'income',
          category_id: salaryCategory.id,
          transaction_date: '2024-01-01'
        }
      ])
      .execute();

    const input: GetCategorySpendingInput = {
      user_id: user.id,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31')
    };

    const result = await getCategorySpending(input);

    // Should only include expense categories
    expect(result).toHaveLength(2);
    
    // Check Food category (should have highest spending)
    const foodSpending = result.find(r => r.category_name === 'Food');
    expect(foodSpending).toBeDefined();
    expect(foodSpending!.total_amount).toBe(250); // 100 + 150
    expect(foodSpending!.transaction_count).toBe(2);
    expect(foodSpending!.percentage_of_total).toBeCloseTo(83.33, 2); // 250/300 * 100

    // Check Transport category
    const transportSpending = result.find(r => r.category_name === 'Transport');
    expect(transportSpending).toBeDefined();
    expect(transportSpending!.total_amount).toBe(50);
    expect(transportSpending!.transaction_count).toBe(1);
    expect(transportSpending!.percentage_of_total).toBeCloseTo(16.67, 2); // 50/300 * 100
  });

  it('should return empty array when no expense transactions exist', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(transactionCategoriesTable)
      .values({ name: 'Salary', type: 'income', user_id: user.id })
      .returning()
      .execute();

    // Create only income transaction
    await db.insert(transactionsTable)
      .values({
        user_id: user.id,
        amount: '3000.00',
        description: 'Monthly salary',
        type: 'income',
        category_id: category.id,
        transaction_date: '2024-01-01'
      })
      .execute();

    const input: GetCategorySpendingInput = {
      user_id: user.id,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31')
    };

    const result = await getCategorySpending(input);
    expect(result).toHaveLength(0);
  });

  it('should filter transactions by date range correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test category
    const [category] = await db.insert(transactionCategoriesTable)
      .values({ name: 'Food', type: 'expense', user_id: user.id })
      .returning()
      .execute();

    // Create transactions in different date ranges
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user.id,
          amount: '100.00',
          description: 'Before range',
          type: 'expense',
          category_id: category.id,
          transaction_date: '2023-12-31'
        },
        {
          user_id: user.id,
          amount: '200.00',
          description: 'In range',
          type: 'expense',
          category_id: category.id,
          transaction_date: '2024-01-15'
        },
        {
          user_id: user.id,
          amount: '300.00',
          description: 'After range',
          type: 'expense',
          category_id: category.id,
          transaction_date: '2024-02-01'
        }
      ])
      .execute();

    const input: GetCategorySpendingInput = {
      user_id: user.id,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31')
    };

    const result = await getCategorySpending(input);

    expect(result).toHaveLength(1);
    expect(result[0].total_amount).toBe(200); // Only the transaction in range
    expect(result[0].transaction_count).toBe(1);
    expect(result[0].percentage_of_total).toBe(100);
  });

  it('should filter transactions by user correctly', async () => {
    // Create two test users
    const users = await db.insert(usersTable)
      .values([
        testUser,
        { ...testUser, email: 'other@example.com' }
      ])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create categories for both users
    const categories = await db.insert(transactionCategoriesTable)
      .values([
        { name: 'Food', type: 'expense', user_id: user1.id },
        { name: 'Food', type: 'expense', user_id: user2.id }
      ])
      .returning()
      .execute();

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user1.id,
          amount: '100.00',
          description: 'User 1 expense',
          type: 'expense',
          category_id: categories[0].id,
          transaction_date: '2024-01-15'
        },
        {
          user_id: user2.id,
          amount: '200.00',
          description: 'User 2 expense',
          type: 'expense',
          category_id: categories[1].id,
          transaction_date: '2024-01-15'
        }
      ])
      .execute();

    const input: GetCategorySpendingInput = {
      user_id: user1.id,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31')
    };

    const result = await getCategorySpending(input);

    expect(result).toHaveLength(1);
    expect(result[0].total_amount).toBe(100); // Only user1's transactions
    expect(result[0].transaction_count).toBe(1);
  });

  it('should handle zero percentage when no spending exists', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const input: GetCategorySpendingInput = {
      user_id: user.id,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31')
    };

    const result = await getCategorySpending(input);
    
    expect(result).toHaveLength(0);
  });

  it('should calculate percentages correctly with multiple categories', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test categories
    const categories = await db.insert(transactionCategoriesTable)
      .values([
        { name: 'Food', type: 'expense', user_id: user.id },
        { name: 'Transport', type: 'expense', user_id: user.id },
        { name: 'Entertainment', type: 'expense', user_id: user.id }
      ])
      .returning()
      .execute();

    // Create transactions with specific amounts for easy percentage calculation
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user.id,
          amount: '50.00', // 50% of total
          description: 'Food expense',
          type: 'expense',
          category_id: categories[0].id,
          transaction_date: '2024-01-15'
        },
        {
          user_id: user.id,
          amount: '30.00', // 30% of total
          description: 'Transport expense',
          type: 'expense',
          category_id: categories[1].id,
          transaction_date: '2024-01-15'
        },
        {
          user_id: user.id,
          amount: '20.00', // 20% of total
          description: 'Entertainment expense',
          type: 'expense',
          category_id: categories[2].id,
          transaction_date: '2024-01-15'
        }
      ])
      .execute();

    const input: GetCategorySpendingInput = {
      user_id: user.id,
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-01-31')
    };

    const result = await getCategorySpending(input);

    expect(result).toHaveLength(3);

    // Find each category and verify percentages
    const food = result.find(r => r.category_name === 'Food')!;
    const transport = result.find(r => r.category_name === 'Transport')!;
    const entertainment = result.find(r => r.category_name === 'Entertainment')!;

    expect(food.percentage_of_total).toBe(50);
    expect(transport.percentage_of_total).toBe(30);
    expect(entertainment.percentage_of_total).toBe(20);

    // Total should equal 100%
    const totalPercentage = result.reduce((sum, r) => sum + r.percentage_of_total, 0);
    expect(totalPercentage).toBe(100);
  });
});