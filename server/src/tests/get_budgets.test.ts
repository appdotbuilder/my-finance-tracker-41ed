import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable, budgetsTable } from '../db/schema';
import { getBudgets } from '../handlers/get_budgets';

describe('getBudgets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no budgets', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const result = await getBudgets(user[0].id);

    expect(result).toEqual([]);
  });

  it('should return user budgets with proper numeric conversion', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create a transaction category for the budget
    const category = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Groceries',
        type: 'expense',
        user_id: user[0].id
      })
      .returning()
      .execute();

    // Create budget with numeric values
    const testBudget = await db.insert(budgetsTable)
      .values({
        user_id: user[0].id,
        name: 'Monthly Grocery Budget',
        category_id: category[0].id,
        budget_amount: '500.75', // Store as string (numeric column)
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      .returning()
      .execute();

    const result = await getBudgets(user[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(testBudget[0].id);
    expect(result[0].name).toEqual('Monthly Grocery Budget');
    expect(result[0].user_id).toEqual(user[0].id);
    expect(result[0].category_id).toEqual(category[0].id);
    expect(result[0].budget_amount).toEqual(500.75); // Should be converted to number
    expect(typeof result[0].budget_amount).toBe('number');
    expect(result[0].period_type).toEqual('monthly');
    expect(result[0].start_date).toBeInstanceOf(Date);
    expect(result[0].end_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple budgets ordered by creation date (newest first)', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create categories
    const categories = await db.insert(transactionCategoriesTable)
      .values([
        {
          name: 'Groceries',
          type: 'expense',
          user_id: user[0].id
        },
        {
          name: 'Entertainment',
          type: 'expense',
          user_id: user[0].id
        }
      ])
      .returning()
      .execute();

    // Create budgets with different creation times
    const firstBudget = await db.insert(budgetsTable)
      .values({
        user_id: user[0].id,
        name: 'First Budget',
        category_id: categories[0].id,
        budget_amount: '300.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      .returning()
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondBudget = await db.insert(budgetsTable)
      .values({
        user_id: user[0].id,
        name: 'Second Budget',
        category_id: categories[1].id,
        budget_amount: '200.50',
        period_type: 'weekly',
        start_date: '2024-01-01',
        end_date: '2024-01-07'
      })
      .returning()
      .execute();

    const result = await getBudgets(user[0].id);

    expect(result).toHaveLength(2);
    // Should be ordered by creation date (newest first)
    expect(result[0].name).toEqual('Second Budget');
    expect(result[0].budget_amount).toEqual(200.50);
    expect(result[0].period_type).toEqual('weekly');
    expect(result[1].name).toEqual('First Budget');
    expect(result[1].budget_amount).toEqual(300.00);
    expect(result[1].period_type).toEqual('monthly');
  });

  it('should handle budgets without category (overall budgets)', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create budget without category (overall budget)
    await db.insert(budgetsTable)
      .values({
        user_id: user[0].id,
        name: 'Overall Monthly Budget',
        category_id: null, // No specific category
        budget_amount: '2000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      })
      .returning()
      .execute();

    const result = await getBudgets(user[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Overall Monthly Budget');
    expect(result[0].category_id).toBeNull();
    expect(result[0].budget_amount).toEqual(2000.00);
    expect(typeof result[0].budget_amount).toBe('number');
  });

  it('should only return budgets for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'One'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashed_password',
          first_name: 'User',
          last_name: 'Two'
        }
      ])
      .returning()
      .execute();

    // Create categories for both users
    const categories = await db.insert(transactionCategoriesTable)
      .values([
        {
          name: 'User1 Category',
          type: 'expense',
          user_id: users[0].id
        },
        {
          name: 'User2 Category',
          type: 'expense',
          user_id: users[1].id
        }
      ])
      .returning()
      .execute();

    // Create budgets for both users
    await db.insert(budgetsTable)
      .values([
        {
          user_id: users[0].id,
          name: 'User1 Budget',
          category_id: categories[0].id,
          budget_amount: '500.00',
          period_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        {
          user_id: users[1].id,
          name: 'User2 Budget',
          category_id: categories[1].id,
          budget_amount: '600.00',
          period_type: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      ])
      .execute();

    // Get budgets for user 1
    const user1Budgets = await getBudgets(users[0].id);
    expect(user1Budgets).toHaveLength(1);
    expect(user1Budgets[0].name).toEqual('User1 Budget');
    expect(user1Budgets[0].user_id).toEqual(users[0].id);

    // Get budgets for user 2
    const user2Budgets = await getBudgets(users[1].id);
    expect(user2Budgets).toHaveLength(1);
    expect(user2Budgets[0].name).toEqual('User2 Budget');
    expect(user2Budgets[0].user_id).toEqual(users[1].id);
  });

  it('should handle various period types and date formats', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create budgets with different period types
    await db.insert(budgetsTable)
      .values([
        {
          user_id: user[0].id,
          name: 'Weekly Budget',
          category_id: null,
          budget_amount: '150.25',
          period_type: 'weekly',
          start_date: '2024-01-01',
          end_date: '2024-01-07'
        },
        {
          user_id: user[0].id,
          name: 'Yearly Budget',
          category_id: null,
          budget_amount: '12000.99',
          period_type: 'yearly',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      ])
      .execute();

    const result = await getBudgets(user[0].id);

    expect(result).toHaveLength(2);
    
    // Find budgets by name to check specific values
    const weeklyBudget = result.find(b => b.name === 'Weekly Budget');
    const yearlyBudget = result.find(b => b.name === 'Yearly Budget');

    expect(weeklyBudget).toBeDefined();
    expect(weeklyBudget!.period_type).toEqual('weekly');
    expect(weeklyBudget!.budget_amount).toEqual(150.25);

    expect(yearlyBudget).toBeDefined();
    expect(yearlyBudget!.period_type).toEqual('yearly');
    expect(yearlyBudget!.budget_amount).toEqual(12000.99);
  });
});