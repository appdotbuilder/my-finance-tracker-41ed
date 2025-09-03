import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, debtsTable } from '../db/schema';
import { deleteDebt } from '../handlers/delete_debt';
import { eq } from 'drizzle-orm';

describe('deleteDebt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing debt', async () => {
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

    // Create test debt
    const debtResult = await db.insert(debtsTable)
      .values({
        user_id: userId,
        lender: 'Test Bank',
        debt_type: 'loan',
        original_amount: '10000.00',
        current_balance: '8000.00',
        interest_rate: '0.0525',
        minimum_payment: '500.00',
        due_date: '2024-12-31'
      })
      .returning()
      .execute();

    const debtId = debtResult[0].id;

    // Delete the debt
    const result = await deleteDebt(debtId, userId);

    // Should return true indicating successful deletion
    expect(result).toBe(true);

    // Verify debt is deleted from database
    const debts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, debtId))
      .execute();

    expect(debts).toHaveLength(0);
  });

  it('should return false when debt does not exist', async () => {
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
    const nonExistentDebtId = 99999;

    // Try to delete non-existent debt
    const result = await deleteDebt(nonExistentDebtId, userId);

    // Should return false
    expect(result).toBe(false);
  });

  it('should return false when debt belongs to different user', async () => {
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

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create debt for user1
    const debtResult = await db.insert(debtsTable)
      .values({
        user_id: user1Id,
        lender: 'Test Bank',
        debt_type: 'credit_card',
        original_amount: '5000.00',
        current_balance: '3000.00',
        interest_rate: '0.1895',
        minimum_payment: '150.00',
        due_date: null
      })
      .returning()
      .execute();

    const debtId = debtResult[0].id;

    // Try to delete user1's debt as user2
    const result = await deleteDebt(debtId, user2Id);

    // Should return false (unauthorized)
    expect(result).toBe(false);

    // Verify debt still exists
    const debts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, debtId))
      .execute();

    expect(debts).toHaveLength(1);
    expect(debts[0].user_id).toBe(user1Id);
  });

  it('should delete debt with null due_date', async () => {
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

    // Create debt with null due_date
    const debtResult = await db.insert(debtsTable)
      .values({
        user_id: userId,
        lender: 'Personal Loan',
        debt_type: 'personal_loan',
        original_amount: '2500.00',
        current_balance: '1800.00',
        interest_rate: '0.0800',
        minimum_payment: '100.00',
        due_date: null
      })
      .returning()
      .execute();

    const debtId = debtResult[0].id;

    // Delete the debt
    const result = await deleteDebt(debtId, userId);

    // Should return true
    expect(result).toBe(true);

    // Verify debt is deleted
    const debts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, debtId))
      .execute();

    expect(debts).toHaveLength(0);
  });

  it('should delete multiple debts for same user independently', async () => {
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

    // Create multiple debts
    const debt1Result = await db.insert(debtsTable)
      .values({
        user_id: userId,
        lender: 'Bank 1',
        debt_type: 'loan',
        original_amount: '10000.00',
        current_balance: '8000.00',
        interest_rate: '0.0525',
        minimum_payment: '500.00',
        due_date: '2024-12-31'
      })
      .returning()
      .execute();

    const debt2Result = await db.insert(debtsTable)
      .values({
        user_id: userId,
        lender: 'Credit Card Co',
        debt_type: 'credit_card',
        original_amount: '3000.00',
        current_balance: '2500.00',
        interest_rate: '0.1995',
        minimum_payment: '75.00',
        due_date: null
      })
      .returning()
      .execute();

    const debt1Id = debt1Result[0].id;
    const debt2Id = debt2Result[0].id;

    // Delete first debt
    const result1 = await deleteDebt(debt1Id, userId);
    expect(result1).toBe(true);

    // Verify first debt is deleted but second remains
    const remainingDebts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.user_id, userId))
      .execute();

    expect(remainingDebts).toHaveLength(1);
    expect(remainingDebts[0].id).toBe(debt2Id);
    expect(remainingDebts[0].lender).toBe('Credit Card Co');

    // Delete second debt
    const result2 = await deleteDebt(debt2Id, userId);
    expect(result2).toBe(true);

    // Verify all debts are deleted
    const allDebts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.user_id, userId))
      .execute();

    expect(allDebts).toHaveLength(0);
  });
});