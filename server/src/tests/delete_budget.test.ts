import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { budgetsTable, usersTable, transactionCategoriesTable } from '../db/schema';
import { deleteBudget } from '../handlers/delete_budget';
import { eq } from 'drizzle-orm';

describe('deleteBudget', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing budget', async () => {
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
    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense',
        user_id: userId
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create a test budget
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        name: 'Test Budget',
        category_id: categoryId,
        budget_amount: '1000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Delete the budget
    const result = await deleteBudget(budgetId, userId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify the budget is deleted from database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();
    
    expect(budgets).toHaveLength(0);
  });

  it('should return false when budget does not exist', async () => {
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
    const userId = userResult[0].id;

    // Try to delete non-existent budget
    const result = await deleteBudget(99999, userId);

    // Should return false for non-existent budget
    expect(result).toBe(false);
  });

  it('should return false when budget belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create a test category for user1
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense',
        user_id: user1Id
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create a budget for user1
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: user1Id,
        name: 'User1 Budget',
        category_id: categoryId,
        budget_amount: '1000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Try to delete user1's budget as user2
    const result = await deleteBudget(budgetId, user2Id);

    // Should return false (not authorized)
    expect(result).toBe(false);

    // Verify the budget still exists
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();
    
    expect(budgets).toHaveLength(1);
    expect(budgets[0].name).toBe('User1 Budget');
  });

  it('should delete budget without category_id (overall budget)', async () => {
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
    const userId = userResult[0].id;

    // Create an overall budget (no category_id)
    const budgetResult = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        name: 'Overall Budget',
        category_id: null,
        budget_amount: '5000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();
    const budgetId = budgetResult[0].id;

    // Delete the budget
    const result = await deleteBudget(budgetId, userId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify the budget is deleted from database
    const budgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.id, budgetId))
      .execute();
    
    expect(budgets).toHaveLength(0);
  });

  it('should handle multiple budgets deletion correctly', async () => {
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
    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(transactionCategoriesTable)
      .values({
        name: 'Test Category',
        type: 'expense',
        user_id: userId
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create multiple budgets
    const budget1Result = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        name: 'Budget 1',
        category_id: categoryId,
        budget_amount: '1000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();

    const budget2Result = await db.insert(budgetsTable)
      .values({
        user_id: userId,
        name: 'Budget 2',
        category_id: categoryId,
        budget_amount: '2000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })
      .returning()
      .execute();

    const budget1Id = budget1Result[0].id;
    const budget2Id = budget2Result[0].id;

    // Delete first budget
    const result1 = await deleteBudget(budget1Id, userId);
    expect(result1).toBe(true);

    // Delete second budget
    const result2 = await deleteBudget(budget2Id, userId);
    expect(result2).toBe(true);

    // Verify both budgets are deleted
    const remainingBudgets = await db.select()
      .from(budgetsTable)
      .where(eq(budgetsTable.user_id, userId))
      .execute();
    
    expect(remainingBudgets).toHaveLength(0);
  });
});