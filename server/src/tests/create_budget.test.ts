import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, transactionCategoriesTable } from '../db/schema';
import { type CreateBudgetInput } from '../schema';
import { createBudget } from '../handlers/create_budget';
import { eq } from 'drizzle-orm';

describe('createBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Food',
        type: 'expense',
        user_id: testUserId
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  const validBudgetInput: CreateBudgetInput = {
    user_id: 0, // Will be set to testUserId in tests
    name: 'Monthly Food Budget',
    category_id: 0, // Will be set to testCategoryId in tests
    budget_amount: 500.00,
    period_type: 'monthly',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31')
  };

  it('should create a budget with category', async () => {
    const input = { ...validBudgetInput, user_id: testUserId, category_id: testCategoryId };
    const result = await createBudget(input);

    // Basic field validation
    expect(result.name).toEqual('Monthly Food Budget');
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.budget_amount).toEqual(500.00);
    expect(typeof result.budget_amount).toBe('number');
    expect(result.period_type).toEqual('monthly');
    expect(result.start_date.toISOString().split('T')[0]).toEqual('2024-01-01');
    expect(result.end_date.toISOString().split('T')[0]).toEqual('2024-01-31');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a budget without category', async () => {
    const input = { ...validBudgetInput, user_id: testUserId, category_id: null };
    const result = await createBudget(input);

    expect(result.name).toEqual('Monthly Food Budget');
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toBeNull();
    expect(result.budget_amount).toEqual(500.00);
    expect(result.id).toBeDefined();
  });

  it('should save budget to database', async () => {
    const input = { ...validBudgetInput, user_id: testUserId, category_id: testCategoryId };
    const result = await createBudget(input);

    // Query using proper drizzle syntax
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].name).toEqual('Monthly Food Budget');
    expect(budgets[0].user_id).toEqual(testUserId);
    expect(budgets[0].category_id).toEqual(testCategoryId);
    expect(parseFloat(budgets[0].budget_amount)).toEqual(500.00);
    expect(budgets[0].period_type).toEqual('monthly');
    expect(budgets[0].created_at).toBeInstanceOf(Date);
    expect(budgets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const input = { ...validBudgetInput, user_id: 999999, category_id: testCategoryId };

    await expect(createBudget(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent category', async () => {
    const input = { ...validBudgetInput, user_id: testUserId, category_id: 999999 };

    await expect(createBudget(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();
    const otherUserId = otherUserResult[0].id;

    // Create category for other user
    const otherCategoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Other Food',
        type: 'expense',
        user_id: otherUserId
      })
      .returning()
      .execute();
    const otherCategoryId = otherCategoryResult[0].id;

    // Try to create budget for testUser using otherUser's category
    const input = { ...validBudgetInput, user_id: testUserId, category_id: otherCategoryId };

    await expect(createBudget(input)).rejects.toThrow(/category does not belong to the specified user/i);
  });

  it('should throw error when start date is not before end date', async () => {
    const input = {
      ...validBudgetInput,
      user_id: testUserId,
      category_id: testCategoryId,
      start_date: new Date('2024-01-31'),
      end_date: new Date('2024-01-01')
    };

    await expect(createBudget(input)).rejects.toThrow(/start date must be before end date/i);
  });

  it('should throw error when start date equals end date', async () => {
    const sameDate = new Date('2024-01-01');
    const input = {
      ...validBudgetInput,
      user_id: testUserId,
      category_id: testCategoryId,
      start_date: sameDate,
      end_date: sameDate
    };

    await expect(createBudget(input)).rejects.toThrow(/start date must be before end date/i);
  });

  it('should handle different period types', async () => {
    const weeklyInput = {
      ...validBudgetInput,
      user_id: testUserId,
      category_id: testCategoryId,
      name: 'Weekly Budget',
      period_type: 'weekly' as const
    };

    const result = await createBudget(weeklyInput);
    expect(result.period_type).toEqual('weekly');

    const yearlyInput = {
      ...validBudgetInput,
      user_id: testUserId,
      category_id: testCategoryId,
      name: 'Yearly Budget',
      period_type: 'yearly' as const
    };

    const yearlyResult = await createBudget(yearlyInput);
    expect(yearlyResult.period_type).toEqual('yearly');
  });

  it('should handle decimal budget amounts correctly', async () => {
    const input = {
      ...validBudgetInput,
      user_id: testUserId,
      category_id: testCategoryId,
      budget_amount: 123.45
    };

    const result = await createBudget(input);
    expect(result.budget_amount).toEqual(123.45);
    expect(typeof result.budget_amount).toBe('number');

    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, result.id))
      .execute();

    expect(parseFloat(budgets[0].budget_amount)).toEqual(123.45);
  });
});