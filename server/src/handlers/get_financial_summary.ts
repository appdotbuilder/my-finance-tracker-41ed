import { db } from '../db';
import { 
  transactionsTable, 
  investmentsTable, 
  debtsTable, 
  budgetsTable,
  transactionCategoriesTable 
} from '../db/schema';
import { type GetFinancialSummaryInput, type FinancialSummary } from '../schema';
import { eq, and, gte, lte, sum, count, sql } from 'drizzle-orm';

export async function getFinancialSummary(input: GetFinancialSummaryInput): Promise<FinancialSummary> {
  try {
    const { user_id, period_start, period_end } = input;

    // Convert dates to strings for database queries
    const startDateStr = period_start.toISOString().split('T')[0];
    const endDateStr = period_end.toISOString().split('T')[0];

    // 1. Calculate total income and expenses from transactions
    const transactionSummary = await db
      .select({
        type: transactionsTable.type,
        total: sum(transactionsTable.amount)
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.user_id, user_id),
          gte(transactionsTable.transaction_date, startDateStr),
          lte(transactionsTable.transaction_date, endDateStr)
        )
      )
      .groupBy(transactionsTable.type)
      .execute();

    let total_income = 0;
    let total_expenses = 0;

    transactionSummary.forEach(summary => {
      const amount = parseFloat(summary.total || '0');
      if (summary.type === 'income') {
        total_income = amount;
      } else if (summary.type === 'expense') {
        total_expenses = amount;
      }
    });

    const net_income = total_income - total_expenses;

    // 2. Calculate total investment values
    const investmentSummary = await db
      .select({
        total_value: sum(investmentsTable.current_value)
      })
      .from(investmentsTable)
      .where(eq(investmentsTable.user_id, user_id))
      .execute();

    const total_investments_value = parseFloat(investmentSummary[0]?.total_value || '0');

    // 3. Calculate total debt balance
    const debtSummary = await db
      .select({
        total_balance: sum(debtsTable.current_balance)
      })
      .from(debtsTable)
      .where(eq(debtsTable.user_id, user_id))
      .execute();

    const total_debt_balance = parseFloat(debtSummary[0]?.total_balance || '0');

    // 4. Calculate budget performance
    const budgets = await db
      .select({
        id: budgetsTable.id,
        name: budgetsTable.name,
        budget_amount: budgetsTable.budget_amount,
        category_id: budgetsTable.category_id
      })
      .from(budgetsTable)
      .where(
        and(
          eq(budgetsTable.user_id, user_id),
          lte(budgetsTable.start_date, endDateStr),
          gte(budgetsTable.end_date, startDateStr)
        )
      )
      .execute();

    const budget_performance = await Promise.all(
      budgets.map(async (budget) => {
        const budget_amount = parseFloat(budget.budget_amount);
        
        // Calculate spent amount for this budget
        const conditions = [
          eq(transactionsTable.user_id, user_id),
          eq(transactionsTable.type, 'expense'),
          gte(transactionsTable.transaction_date, startDateStr),
          lte(transactionsTable.transaction_date, endDateStr)
        ];

        // If budget is category-specific, filter by category
        if (budget.category_id) {
          conditions.push(eq(transactionsTable.category_id, budget.category_id));
        }

        const spentQuery = db
          .select({
            spent: sum(transactionsTable.amount)
          })
          .from(transactionsTable)
          .where(and(...conditions));

        const spentResult = await spentQuery.execute();
        const spent_amount = parseFloat(spentResult[0]?.spent || '0');
        
        const remaining_amount = budget_amount - spent_amount;
        const percentage_used = budget_amount > 0 ? (spent_amount / budget_amount) * 100 : 0;

        return {
          budget_name: budget.name,
          budget_amount,
          spent_amount,
          remaining_amount,
          percentage_used
        };
      })
    );

    return {
      user_id,
      period_start,
      period_end,
      total_income,
      total_expenses,
      net_income,
      total_investments_value,
      total_debt_balance,
      budget_performance
    };

  } catch (error) {
    console.error('Financial summary calculation failed:', error);
    throw error;
  }
}