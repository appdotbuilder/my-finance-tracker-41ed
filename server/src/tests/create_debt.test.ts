import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { debtsTable, usersTable } from '../db/schema';
import { type CreateDebtInput } from '../schema';
import { createDebt } from '../handlers/create_debt';
import { eq } from 'drizzle-orm';

describe('createDebt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    return result[0];
  };

  const testInput: CreateDebtInput = {
    user_id: 1, // Will be replaced with actual user ID
    lender: 'Chase Bank',
    debt_type: 'credit_card',
    original_amount: 5000.00,
    current_balance: 3500.75,
    interest_rate: 0.1895, // 18.95%
    minimum_payment: 125.50,
    due_date: new Date('2024-12-15')
  };

  it('should create a debt record', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createDebt(input);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.lender).toEqual('Chase Bank');
    expect(result.debt_type).toEqual('credit_card');
    expect(result.original_amount).toEqual(5000.00);
    expect(result.current_balance).toEqual(3500.75);
    expect(result.interest_rate).toEqual(0.1895);
    expect(result.minimum_payment).toEqual(125.50);
    expect(result.due_date).toEqual(new Date('2024-12-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save debt to database', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createDebt(input);

    // Query database to verify record was saved
    const debts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, result.id))
      .execute();

    expect(debts).toHaveLength(1);
    expect(debts[0].user_id).toEqual(user.id);
    expect(debts[0].lender).toEqual('Chase Bank');
    expect(debts[0].debt_type).toEqual('credit_card');
    expect(parseFloat(debts[0].original_amount)).toEqual(5000.00);
    expect(parseFloat(debts[0].current_balance)).toEqual(3500.75);
    expect(parseFloat(debts[0].interest_rate)).toEqual(0.1895);
    expect(parseFloat(debts[0].minimum_payment)).toEqual(125.50);
    expect(debts[0].due_date).toEqual('2024-12-15');
    expect(debts[0].created_at).toBeInstanceOf(Date);
    expect(debts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable due_date', async () => {
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id, due_date: null };

    const result = await createDebt(input);

    expect(result.due_date).toBeNull();
    expect(result.lender).toEqual('Chase Bank');
    expect(result.current_balance).toEqual(3500.75);

    // Verify in database
    const debts = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.id, result.id))
      .execute();

    expect(debts[0].due_date).toBeNull();
  });

  it('should handle different debt types', async () => {
    const user = await createTestUser();
    
    const mortgageInput: CreateDebtInput = {
      user_id: user.id,
      lender: 'Wells Fargo',
      debt_type: 'mortgage',
      original_amount: 350000.00,
      current_balance: 325000.50,
      interest_rate: 0.0375, // 3.75%
      minimum_payment: 1850.00,
      due_date: new Date('2025-01-01')
    };

    const result = await createDebt(mortgageInput);

    expect(result.debt_type).toEqual('mortgage');
    expect(result.lender).toEqual('Wells Fargo');
    expect(result.original_amount).toEqual(350000.00);
    expect(result.current_balance).toEqual(325000.50);
    expect(result.interest_rate).toEqual(0.0375);
    expect(result.minimum_payment).toEqual(1850.00);
  });

  it('should handle high precision numeric values correctly', async () => {
    const user = await createTestUser();
    const input: CreateDebtInput = {
      user_id: user.id,
      lender: 'Credit Union',
      debt_type: 'personal_loan',
      original_amount: 12345.67,
      current_balance: 9876.54,
      interest_rate: 0.0875, // 8.75%
      minimum_payment: 255.33,
      due_date: new Date('2024-11-30')
    };

    const result = await createDebt(input);

    // Verify numeric precision is maintained
    expect(typeof result.original_amount).toBe('number');
    expect(typeof result.current_balance).toBe('number');
    expect(typeof result.interest_rate).toBe('number');
    expect(typeof result.minimum_payment).toBe('number');
    expect(result.original_amount).toEqual(12345.67);
    expect(result.current_balance).toEqual(9876.54);
    expect(result.interest_rate).toEqual(0.0875);
    expect(result.minimum_payment).toEqual(255.33);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, user_id: 999 }; // Non-existent user ID

    await expect(createDebt(input)).rejects.toThrow(/User with ID 999 does not exist/i);
  });

  it('should handle zero current balance', async () => {
    const user = await createTestUser();
    const input: CreateDebtInput = {
      user_id: user.id,
      lender: 'Local Bank',
      debt_type: 'loan',
      original_amount: 10000.00,
      current_balance: 0.00, // Paid off
      interest_rate: 0.055,
      minimum_payment: 200.00,
      due_date: null
    };

    const result = await createDebt(input);

    expect(result.current_balance).toEqual(0.00);
    expect(result.original_amount).toEqual(10000.00);
  });

  it('should handle all debt types', async () => {
    const user = await createTestUser();
    const debtTypes = ['loan', 'credit_card', 'mortgage', 'personal_loan', 'other'] as const;

    for (const debtType of debtTypes) {
      const input: CreateDebtInput = {
        user_id: user.id,
        lender: `Test ${debtType} Lender`,
        debt_type: debtType,
        original_amount: 1000.00,
        current_balance: 800.00,
        interest_rate: 0.05,
        minimum_payment: 50.00,
        due_date: new Date('2024-12-31')
      };

      const result = await createDebt(input);
      expect(result.debt_type).toEqual(debtType);
      expect(result.lender).toEqual(`Test ${debtType} Lender`);
    }
  });
});