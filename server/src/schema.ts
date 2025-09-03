import { z } from 'zod';

// User Authentication Schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

export const requestPasswordResetInputSchema = z.object({
  email: z.string().email(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetInputSchema>;

export const resetPasswordInputSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  new_password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

// Transaction Category Schema
export const transactionCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(['income', 'expense']),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type TransactionCategory = z.infer<typeof transactionCategorySchema>;

export const createTransactionCategoryInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  user_id: z.number()
});

export type CreateTransactionCategoryInput = z.infer<typeof createTransactionCategoryInputSchema>;

// Transaction Schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  description: z.string(),
  type: z.enum(['income', 'expense']),
  category_id: z.number(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  description: z.string().min(1),
  type: z.enum(['income', 'expense']),
  category_id: z.number(),
  transaction_date: z.coerce.date()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.number().optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Budget Schema
export const budgetSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  category_id: z.number().nullable(),
  budget_amount: z.number(),
  period_type: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Budget = z.infer<typeof budgetSchema>;

export const createBudgetInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  category_id: z.number().nullable(),
  budget_amount: z.number().positive(),
  period_type: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

export const updateBudgetInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  category_id: z.number().nullable().optional(),
  budget_amount: z.number().positive().optional(),
  period_type: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetInputSchema>;

// Investment Schema
export const investmentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: z.enum(['stock', 'mutual_fund', 'cryptocurrency', 'bond', 'etf', 'other']),
  quantity: z.number(),
  purchase_price: z.number(),
  current_value: z.number(),
  purchase_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Investment = z.infer<typeof investmentSchema>;

export const createInvestmentInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  type: z.enum(['stock', 'mutual_fund', 'cryptocurrency', 'bond', 'etf', 'other']),
  quantity: z.number().positive(),
  purchase_price: z.number().positive(),
  current_value: z.number().positive(),
  purchase_date: z.coerce.date()
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentInputSchema>;

export const updateInvestmentInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  type: z.enum(['stock', 'mutual_fund', 'cryptocurrency', 'bond', 'etf', 'other']).optional(),
  quantity: z.number().positive().optional(),
  purchase_price: z.number().positive().optional(),
  current_value: z.number().positive().optional(),
  purchase_date: z.coerce.date().optional()
});

export type UpdateInvestmentInput = z.infer<typeof updateInvestmentInputSchema>;

// Debt/Loan Schema
export const debtSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  lender: z.string(),
  debt_type: z.enum(['loan', 'credit_card', 'mortgage', 'personal_loan', 'other']),
  original_amount: z.number(),
  current_balance: z.number(),
  interest_rate: z.number(),
  minimum_payment: z.number(),
  due_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Debt = z.infer<typeof debtSchema>;

export const createDebtInputSchema = z.object({
  user_id: z.number(),
  lender: z.string().min(1),
  debt_type: z.enum(['loan', 'credit_card', 'mortgage', 'personal_loan', 'other']),
  original_amount: z.number().positive(),
  current_balance: z.number().nonnegative(),
  interest_rate: z.number().nonnegative(),
  minimum_payment: z.number().positive(),
  due_date: z.coerce.date().nullable()
});

export type CreateDebtInput = z.infer<typeof createDebtInputSchema>;

export const updateDebtInputSchema = z.object({
  id: z.number(),
  lender: z.string().min(1).optional(),
  debt_type: z.enum(['loan', 'credit_card', 'mortgage', 'personal_loan', 'other']).optional(),
  original_amount: z.number().positive().optional(),
  current_balance: z.number().nonnegative().optional(),
  interest_rate: z.number().nonnegative().optional(),
  minimum_payment: z.number().positive().optional(),
  due_date: z.coerce.date().nullable().optional()
});

export type UpdateDebtInput = z.infer<typeof updateDebtInputSchema>;

// Financial Summary Schema for Reports
export const financialSummarySchema = z.object({
  user_id: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  total_income: z.number(),
  total_expenses: z.number(),
  net_income: z.number(),
  total_investments_value: z.number(),
  total_debt_balance: z.number(),
  budget_performance: z.array(z.object({
    budget_name: z.string(),
    budget_amount: z.number(),
    spent_amount: z.number(),
    remaining_amount: z.number(),
    percentage_used: z.number()
  }))
});

export type FinancialSummary = z.infer<typeof financialSummarySchema>;

export const getFinancialSummaryInputSchema = z.object({
  user_id: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type GetFinancialSummaryInput = z.infer<typeof getFinancialSummaryInputSchema>;

// Category Spending Schema for Reports
export const categorySpendingSchema = z.object({
  category_id: z.number(),
  category_name: z.string(),
  total_amount: z.number(),
  transaction_count: z.number(),
  percentage_of_total: z.number()
});

export type CategorySpending = z.infer<typeof categorySpendingSchema>;

export const getCategorySpendingInputSchema = z.object({
  user_id: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type GetCategorySpendingInput = z.infer<typeof getCategorySpendingInputSchema>;