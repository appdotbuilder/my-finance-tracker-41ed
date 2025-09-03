import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, transactionCategoriesTable } from '../db/schema';
import { type UpdateBudgetInput } from '../schema';
import { updateBudget } from '../handlers/update_budget';
import { eq } from 'drizzle-orm';

describe('updateBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;
  let testBudgetId: number;

  beforeEach(async () => {
    // Create a test user
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

    // Create a test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense',
        user_id: testUserId
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create a test budget
    const budgetInsertData = {
      user_id: testUserId,
      name: 'Original Budget',
      category_id: testCategoryId,
      budget_amount: '1000.00',
      period_type: 'monthly' as const,
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    };
    
    const budgetResult = await db.insert(budgetsTable)
      .values(budgetInsertData)
      .returning()
      .execute();
    testBudgetId = budgetResult[0].id;
  });

  it('should update all fields when provided', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      name: 'Updated Budget Name',
      category_id: null, // Change to overall budget
      budget_amount: 1500.50,
      period_type: 'yearly',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-28')
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.name).toEqual('Updated Budget Name');
    expect(result.category_id).toBeNull();
    expect(result.budget_amount).toEqual(1500.50);
    expect(typeof result.budget_amount).toBe('number');
    expect(result.period_type).toEqual('yearly');
    expect(result.start_date).toEqual(new Date('2024-02-01'));
    expect(result.end_date).toEqual(new Date('2024-02-28'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      name: 'Partially Updated Budget',
      budget_amount: 2000.75
    };

    const result = await updateBudget(updateInput);

    expect(result.id).toEqual(testBudgetId);
    expect(result.name).toEqual('Partially Updated Budget');
    expect(result.budget_amount).toEqual(2000.75);
    expect(typeof result.budget_amount).toBe('number');
    // These should remain unchanged
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.period_type).toEqual('monthly');
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-12-31'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update budget in database', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      name: 'Database Updated Budget',
      budget_amount: 3000.25
    };

    await updateBudget(updateInput);

    // Verify the update was persisted in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();

    expect(budgets).toHaveLength(1);
    expect(budgets[0].name).toEqual('Database Updated Budget');
    expect(parseFloat(budgets[0].budget_amount)).toEqual(3000.25);
    expect(budgets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update category_id to null for overall budget', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      category_id: null
    };

    const result = await updateBudget(updateInput);

    expect(result.category_id).toBeNull();

    // Verify in database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();

    expect(budgets[0].category_id).toBeNull();
  });

  it('should handle date updates correctly', async () => {
    const newStartDate = new Date('2024-03-01');
    const newEndDate = new Date('2024-03-31');
    
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      start_date: newStartDate,
      end_date: newEndDate
    };

    const result = await updateBudget(updateInput);

    expect(result.start_date).toEqual(newStartDate);
    expect(result.end_date).toEqual(newEndDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when budget does not exist', async () => {
    const updateInput: UpdateBudgetInput = {
      id: 99999, // Non-existent budget ID
      name: 'Non-existent Budget'
    };

    expect(updateBudget(updateInput)).rejects.toThrow(/Budget with ID 99999 not found/);
  });

  it('should handle decimal precision correctly', async () => {
    const updateInput: UpdateBudgetInput = {
      id: testBudgetId,
      budget_amount: 123.456 // Will be rounded to 2 decimal places in database
    };

    const result = await updateBudget(updateInput);

    expect(result.budget_amount).toEqual(123.46); // Rounded to 2 decimal places
    expect(typeof result.budget_amount).toBe('number');
  });

  it('should update only updated_at when no other fields provided', async () => {
    // Get original budget
    const originalBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, testBudgetId))
      .execute();
    const originalUpdatedAt = originalBudgets[0].updated_at;

    // Wait a small amount to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateBudgetInput = {
      id: testBudgetId
      // No other fields provided
    };

    const result = await updateBudget(updateInput);

    // All fields should be unchanged except updated_at
    expect(result.name).toEqual('Original Budget');
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.budget_amount).toEqual(1000);
    expect(result.period_type).toEqual('monthly');
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});