import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, debtsTable } from '../db/schema';
import { getDebts } from '../handlers/get_debts';

describe('getDebts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no debts', async () => {
    // Create a user with no debts
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const result = await getDebts(user.id);

    expect(result).toEqual([]);
  });

  it('should return all debts for a user with proper numeric conversions', async () => {
    // Create a user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create test debts
    const testDate1 = new Date('2024-06-01');
    const testDate2 = new Date('2024-05-15');

    await db.insert(debtsTable)
      .values([
        {
          user_id: user.id,
          lender: 'Credit Card Company',
          debt_type: 'credit_card',
          original_amount: '5000.00',
          current_balance: '3250.75',
          interest_rate: '0.1850',
          minimum_payment: '150.00',
          due_date: '2024-06-01'
        },
        {
          user_id: user.id,
          lender: 'Bank Loan',
          debt_type: 'personal_loan',
          original_amount: '10000.00',
          current_balance: '8500.50',
          interest_rate: '0.0675',
          minimum_payment: '250.25',
          due_date: '2024-05-15'
        }
      ])
      .execute();

    const result = await getDebts(user.id);

    expect(result).toHaveLength(2);
    
    // Check first debt (should be ordered by due_date - earliest first)
    expect(result[0].lender).toEqual('Bank Loan');
    expect(result[0].debt_type).toEqual('personal_loan');
    expect(result[0].original_amount).toEqual(10000.00);
    expect(result[0].current_balance).toEqual(8500.50);
    expect(result[0].interest_rate).toEqual(0.0675);
    expect(result[0].minimum_payment).toEqual(250.25);
    expect(result[0].due_date).toEqual(testDate2);
    expect(typeof result[0].original_amount).toBe('number');
    expect(typeof result[0].current_balance).toBe('number');
    expect(typeof result[0].interest_rate).toBe('number');
    expect(typeof result[0].minimum_payment).toBe('number');

    // Check second debt
    expect(result[1].lender).toEqual('Credit Card Company');
    expect(result[1].debt_type).toEqual('credit_card');
    expect(result[1].original_amount).toEqual(5000.00);
    expect(result[1].current_balance).toEqual(3250.75);
    expect(result[1].interest_rate).toEqual(0.1850);
    expect(result[1].minimum_payment).toEqual(150.00);
    expect(result[1].due_date).toEqual(testDate1);
  });

  it('should handle debts with null due dates and sort them correctly', async () => {
    // Create a user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create debts with mixed due dates (some null)
    const testDate = new Date('2024-12-01');

    await db.insert(debtsTable)
      .values([
        {
          user_id: user.id,
          lender: 'Flexible Lender',
          debt_type: 'other',
          original_amount: '1000.00',
          current_balance: '800.00',
          interest_rate: '0.0500',
          minimum_payment: '100.00',
          due_date: null // No due date
        },
        {
          user_id: user.id,
          lender: 'Fixed Term Lender',
          debt_type: 'loan',
          original_amount: '2000.00',
          current_balance: '1500.00',
          interest_rate: '0.0400',
          minimum_payment: '200.00',
          due_date: '2024-12-01'
        }
      ])
      .execute();

    const result = await getDebts(user.id);

    expect(result).toHaveLength(2);
    
    // Debt with due date should come first
    expect(result[0].lender).toEqual('Fixed Term Lender');
    expect(result[0].due_date).toEqual(testDate);
    
    // Debt without due date should come second
    expect(result[1].lender).toEqual('Flexible Lender');
    expect(result[1].due_date).toBeNull();
  });

  it('should only return debts for the specified user', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create debts for both users
    await db.insert(debtsTable)
      .values([
        {
          user_id: user1.id,
          lender: 'User1 Lender',
          debt_type: 'loan',
          original_amount: '1000.00',
          current_balance: '800.00',
          interest_rate: '0.0500',
          minimum_payment: '100.00',
          due_date: null
        },
        {
          user_id: user2.id,
          lender: 'User2 Lender',
          debt_type: 'credit_card',
          original_amount: '2000.00',
          current_balance: '1500.00',
          interest_rate: '0.1500',
          minimum_payment: '200.00',
          due_date: null
        }
      ])
      .execute();

    const user1Debts = await getDebts(user1.id);
    const user2Debts = await getDebts(user2.id);

    expect(user1Debts).toHaveLength(1);
    expect(user1Debts[0].lender).toEqual('User1 Lender');
    expect(user1Debts[0].user_id).toEqual(user1.id);

    expect(user2Debts).toHaveLength(1);
    expect(user2Debts[0].lender).toEqual('User2 Lender');
    expect(user2Debts[0].user_id).toEqual(user2.id);
  });

  it('should handle all debt types correctly', async () => {
    // Create a user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create debts of different types
    await db.insert(debtsTable)
      .values([
        {
          user_id: user.id,
          lender: 'Mortgage Company',
          debt_type: 'mortgage',
          original_amount: '250000.00',
          current_balance: '200000.00',
          interest_rate: '0.0350',
          minimum_payment: '1200.00',
          due_date: '2024-01-01'
        },
        {
          user_id: user.id,
          lender: 'Personal Loan Provider',
          debt_type: 'personal_loan',
          original_amount: '15000.00',
          current_balance: '12000.50',
          interest_rate: '0.0825',
          minimum_payment: '350.75',
          due_date: '2024-02-15'
        }
      ])
      .execute();

    const result = await getDebts(user.id);

    expect(result).toHaveLength(2);
    
    // Check all debt types are preserved
    const debtTypes = result.map(debt => debt.debt_type);
    expect(debtTypes).toContain('mortgage');
    expect(debtTypes).toContain('personal_loan');

    // Verify mortgage details
    const mortgage = result.find(debt => debt.debt_type === 'mortgage');
    expect(mortgage?.original_amount).toEqual(250000.00);
    expect(mortgage?.current_balance).toEqual(200000.00);
    expect(mortgage?.minimum_payment).toEqual(1200.00);
  });
});