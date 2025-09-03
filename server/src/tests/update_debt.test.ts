import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, debtsTable } from '../db/schema';
import { type UpdateDebtInput, type CreateDebtInput } from '../schema';
import { updateDebt } from '../handlers/update_debt';
import { eq } from 'drizzle-orm';

describe('updateDebt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let debtId: number;

  beforeEach(async () => {
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
    
    userId = userResult[0].id;

    // Create test debt
    const debtResult = await db.insert(debtsTable)
      .values({
        user_id: userId,
        lender: 'Original Bank',
        debt_type: 'loan',
        original_amount: '10000.00',
        current_balance: '8500.50',
        interest_rate: '0.0525',
        minimum_payment: '250.00',
        due_date: '2025-12-15'
      })
      .returning()
      .execute();

    debtId = debtResult[0].id;
  });

  it('should update all debt fields', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      lender: 'New Credit Union',
      debt_type: 'credit_card',
      original_amount: 12000,
      current_balance: 7500.25,
      interest_rate: 0.0475,
      minimum_payment: 300.50,
      due_date: new Date('2026-01-31')
    };

    const result = await updateDebt(updateInput);

    expect(result.id).toEqual(debtId);
    expect(result.user_id).toEqual(userId);
    expect(result.lender).toEqual('New Credit Union');
    expect(result.debt_type).toEqual('credit_card');
    expect(result.original_amount).toEqual(12000);
    expect(result.current_balance).toEqual(7500.25);
    expect(result.interest_rate).toEqual(0.0475);
    expect(result.minimum_payment).toEqual(300.50);
    expect(result.due_date).toEqual(new Date('2026-01-31'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields (partial update)', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      current_balance: 7000.00,
      minimum_payment: 275.00
    };

    const result = await updateDebt(updateInput);

    // Updated fields
    expect(result.current_balance).toEqual(7000.00);
    expect(result.minimum_payment).toEqual(275.00);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Unchanged fields should remain the same
    expect(result.lender).toEqual('Original Bank');
    expect(result.debt_type).toEqual('loan');
    expect(result.original_amount).toEqual(10000);
    expect(result.interest_rate).toEqual(0.0525);
    expect(result.due_date).toEqual(new Date('2025-12-15'));
  });

  it('should handle balance update after payment', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      current_balance: 8000.25 // Payment of 500.25 made
    };

    const result = await updateDebt(updateInput);

    expect(result.current_balance).toEqual(8000.25);
    expect(typeof result.current_balance).toBe('number');
    
    // Verify in database
    const dbDebt = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, debtId))
      .execute();

    expect(parseFloat(dbDebt[0].current_balance)).toEqual(8000.25);
  });

  it('should handle nullable due_date field', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      due_date: null
    };

    const result = await updateDebt(updateInput);

    expect(result.due_date).toBeNull();
  });

  it('should persist updates to database', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      lender: 'Updated Lender',
      current_balance: 6500.75,
      interest_rate: 0.0400
    };

    await updateDebt(updateInput);

    // Verify changes in database
    const debts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, debtId))
      .execute();

    expect(debts).toHaveLength(1);
    const debt = debts[0];
    expect(debt.lender).toEqual('Updated Lender');
    expect(parseFloat(debt.current_balance)).toEqual(6500.75);
    expect(parseFloat(debt.interest_rate)).toEqual(0.0400);
    expect(debt.updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero balance (debt paid off)', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      current_balance: 0,
      minimum_payment: 0
    };

    const result = await updateDebt(updateInput);

    expect(result.current_balance).toEqual(0);
    expect(result.minimum_payment).toEqual(0);
    expect(typeof result.current_balance).toBe('number');
    expect(typeof result.minimum_payment).toBe('number');
  });

  it('should throw error for non-existent debt', async () => {
    const updateInput: UpdateDebtInput = {
      id: 99999,
      current_balance: 5000
    };

    await expect(updateDebt(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle decimal precision correctly', async () => {
    const updateInput: UpdateDebtInput = {
      id: debtId,
      current_balance: 1234.56,
      interest_rate: 0.0425,
      minimum_payment: 78.90
    };

    const result = await updateDebt(updateInput);

    expect(result.current_balance).toEqual(1234.56);
    expect(result.interest_rate).toEqual(0.0425);
    expect(result.minimum_payment).toEqual(78.90);

    // Verify precision in database
    const dbDebt = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, debtId))
      .execute();

    expect(parseFloat(dbDebt[0].current_balance)).toEqual(1234.56);
    expect(parseFloat(dbDebt[0].interest_rate)).toEqual(0.0425);
    expect(parseFloat(dbDebt[0].minimum_payment)).toEqual(78.90);
  });

  it('should update timestamps correctly', async () => {
    const beforeUpdate = new Date();
    
    const updateInput: UpdateDebtInput = {
      id: debtId,
      current_balance: 7500
    };

    const result = await updateDebt(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeLessThan(result.updated_at.getTime());
  });
});