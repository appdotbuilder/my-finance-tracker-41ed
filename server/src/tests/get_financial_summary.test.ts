import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  transactionsTable, 
  transactionCategoriesTable,
  budgetsTable,
  investmentsTable,
  debtsTable
} from '../db/schema';
import { type GetFinancialSummaryInput } from '../schema';
import { getFinancialSummary } from '../handlers/get_financial_summary';

// Test data setup
const testUserId = 1;
const periodStart = new Date('2024-01-01');
const periodEnd = new Date('2024-01-31');

const testInput: GetFinancialSummaryInput = {
  user_id: testUserId,
  period_start: periodStart,
  period_end: periodEnd
};

describe('getFinancialSummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty summary for user with no data', async () => {
    // Create user but no other data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.user_id).toEqual(testUserId);
    expect(result.period_start).toEqual(periodStart);
    expect(result.period_end).toEqual(periodEnd);
    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(0);
    expect(result.total_investments_value).toEqual(0);
    expect(result.total_debt_balance).toEqual(0);
    expect(result.budget_performance).toHaveLength(0);
  });

  it('should calculate transaction totals correctly', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    await db.insert(transactionCategoriesTable).values([
      { name: 'Salary', type: 'income', user_id: testUserId },
      { name: 'Groceries', type: 'expense', user_id: testUserId }
    ]).execute();

    // Create transactions within the period
    await db.insert(transactionsTable).values([
      {
        user_id: testUserId,
        amount: '5000.00',
        description: 'January Salary',
        type: 'income',
        category_id: 1,
        transaction_date: '2024-01-15'
      },
      {
        user_id: testUserId,
        amount: '1200.00',
        description: 'Freelance Work',
        type: 'income',
        category_id: 1,
        transaction_date: '2024-01-20'
      },
      {
        user_id: testUserId,
        amount: '800.00',
        description: 'Weekly Groceries',
        type: 'expense',
        category_id: 2,
        transaction_date: '2024-01-10'
      },
      {
        user_id: testUserId,
        amount: '300.00',
        description: 'More Groceries',
        type: 'expense',
        category_id: 2,
        transaction_date: '2024-01-25'
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.total_income).toEqual(6200);
    expect(result.total_expenses).toEqual(1100);
    expect(result.net_income).toEqual(5100);
    expect(typeof result.total_income).toBe('number');
    expect(typeof result.total_expenses).toBe('number');
  });

  it('should exclude transactions outside the date range', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    await db.insert(transactionCategoriesTable).values([
      { name: 'Salary', type: 'income', user_id: testUserId }
    ]).execute();

    // Create transactions - some in range, some outside
    await db.insert(transactionsTable).values([
      {
        user_id: testUserId,
        amount: '1000.00',
        description: 'December Income',
        type: 'income',
        category_id: 1,
        transaction_date: '2023-12-15' // Outside range
      },
      {
        user_id: testUserId,
        amount: '2000.00',
        description: 'January Income',
        type: 'income',
        category_id: 1,
        transaction_date: '2024-01-15' // In range
      },
      {
        user_id: testUserId,
        amount: '3000.00',
        description: 'February Income',
        type: 'income',
        category_id: 1,
        transaction_date: '2024-02-15' // Outside range
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.total_income).toEqual(2000); // Only January transaction
    expect(result.total_expenses).toEqual(0);
    expect(result.net_income).toEqual(2000);
  });

  it('should calculate investment values correctly', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    // Create investments
    await db.insert(investmentsTable).values([
      {
        user_id: testUserId,
        name: 'Apple Stock',
        type: 'stock',
        quantity: '10.0',
        purchase_price: '150.00',
        current_value: '1800.00',
        purchase_date: '2023-12-01'
      },
      {
        user_id: testUserId,
        name: 'Bitcoin',
        type: 'cryptocurrency',
        quantity: '0.5',
        purchase_price: '40000.00',
        current_value: '25000.00',
        purchase_date: '2023-11-01'
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.total_investments_value).toEqual(26800);
    expect(typeof result.total_investments_value).toBe('number');
  });

  it('should calculate debt balances correctly', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    // Create debts
    await db.insert(debtsTable).values([
      {
        user_id: testUserId,
        lender: 'Credit Card Company',
        debt_type: 'credit_card',
        original_amount: '5000.00',
        current_balance: '3200.00',
        interest_rate: '0.1899',
        minimum_payment: '150.00',
        due_date: '2024-02-01'
      },
      {
        user_id: testUserId,
        lender: 'Bank Mortgage',
        debt_type: 'mortgage',
        original_amount: '300000.00',
        current_balance: '285000.00',
        interest_rate: '0.0325',
        minimum_payment: '1500.00',
        due_date: '2024-02-01'
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.total_debt_balance).toEqual(288200);
    expect(typeof result.total_debt_balance).toBe('number');
  });

  it('should calculate budget performance correctly', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    await db.insert(transactionCategoriesTable).values([
      { name: 'Groceries', type: 'expense', user_id: testUserId },
      { name: 'Entertainment', type: 'expense', user_id: testUserId }
    ]).execute();

    // Create budgets that overlap with the period
    await db.insert(budgetsTable).values([
      {
        user_id: testUserId,
        name: 'Monthly Groceries',
        category_id: 1,
        budget_amount: '800.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      },
      {
        user_id: testUserId,
        name: 'Overall Monthly Budget',
        category_id: null, // Overall budget
        budget_amount: '3000.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }
    ]).execute();

    // Create expense transactions
    await db.insert(transactionsTable).values([
      {
        user_id: testUserId,
        amount: '300.00',
        description: 'Grocery Shopping',
        type: 'expense',
        category_id: 1,
        transaction_date: '2024-01-10'
      },
      {
        user_id: testUserId,
        amount: '200.00',
        description: 'More Groceries',
        type: 'expense',
        category_id: 1,
        transaction_date: '2024-01-20'
      },
      {
        user_id: testUserId,
        amount: '150.00',
        description: 'Movie Night',
        type: 'expense',
        category_id: 2,
        transaction_date: '2024-01-15'
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.budget_performance).toHaveLength(2);

    // Find grocery budget performance
    const groceryBudget = result.budget_performance.find(b => b.budget_name === 'Monthly Groceries');
    expect(groceryBudget).toBeDefined();
    expect(groceryBudget?.budget_amount).toEqual(800);
    expect(groceryBudget?.spent_amount).toEqual(500); // Only grocery transactions
    expect(groceryBudget?.remaining_amount).toEqual(300);
    expect(groceryBudget?.percentage_used).toEqual(62.5);

    // Find overall budget performance
    const overallBudget = result.budget_performance.find(b => b.budget_name === 'Overall Monthly Budget');
    expect(overallBudget).toBeDefined();
    expect(overallBudget?.budget_amount).toEqual(3000);
    expect(overallBudget?.spent_amount).toEqual(650); // All expense transactions
    expect(overallBudget?.remaining_amount).toEqual(2350);
    expect(Math.round(overallBudget?.percentage_used || 0)).toEqual(22); // Rounded percentage
  });

  it('should handle budgets outside the date range', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    await db.insert(transactionCategoriesTable).values([
      { name: 'Groceries', type: 'expense', user_id: testUserId }
    ]).execute();

    // Create budget that doesn't overlap with period
    await db.insert(budgetsTable).values([
      {
        user_id: testUserId,
        name: 'February Budget',
        category_id: 1,
        budget_amount: '800.00',
        period_type: 'monthly',
        start_date: '2024-02-01',
        end_date: '2024-02-29' // Outside our test period
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    expect(result.budget_performance).toHaveLength(0);
  });

  it('should provide complete financial summary with all components', async () => {
    // Create comprehensive test data
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hashed',
      first_name: 'Test',
      last_name: 'User'
    }).execute();

    await db.insert(transactionCategoriesTable).values([
      { name: 'Salary', type: 'income', user_id: testUserId },
      { name: 'Food', type: 'expense', user_id: testUserId }
    ]).execute();

    // Add all types of financial data
    await db.insert(transactionsTable).values([
      {
        user_id: testUserId,
        amount: '4000.00',
        description: 'Salary',
        type: 'income',
        category_id: 1,
        transaction_date: '2024-01-15'
      },
      {
        user_id: testUserId,
        amount: '1000.00',
        description: 'Food expenses',
        type: 'expense',
        category_id: 2,
        transaction_date: '2024-01-10'
      }
    ]).execute();

    await db.insert(investmentsTable).values([
      {
        user_id: testUserId,
        name: 'Stock Portfolio',
        type: 'stock',
        quantity: '100.0',
        purchase_price: '50.00',
        current_value: '7500.00',
        purchase_date: '2023-12-01'
      }
    ]).execute();

    await db.insert(debtsTable).values([
      {
        user_id: testUserId,
        lender: 'Bank Loan',
        debt_type: 'loan',
        original_amount: '10000.00',
        current_balance: '7500.00',
        interest_rate: '0.0550',
        minimum_payment: '200.00',
        due_date: '2024-12-31'
      }
    ]).execute();

    await db.insert(budgetsTable).values([
      {
        user_id: testUserId,
        name: 'Monthly Food Budget',
        category_id: 2,
        budget_amount: '1200.00',
        period_type: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }
    ]).execute();

    const result = await getFinancialSummary(testInput);

    // Verify all components are present and correct
    expect(result.user_id).toEqual(testUserId);
    expect(result.total_income).toEqual(4000);
    expect(result.total_expenses).toEqual(1000);
    expect(result.net_income).toEqual(3000);
    expect(result.total_investments_value).toEqual(7500);
    expect(result.total_debt_balance).toEqual(7500);
    expect(result.budget_performance).toHaveLength(1);
    expect(result.budget_performance[0].budget_name).toEqual('Monthly Food Budget');
    expect(result.budget_performance[0].spent_amount).toEqual(1000);
    expect(result.budget_performance[0].remaining_amount).toEqual(200);
  });
});