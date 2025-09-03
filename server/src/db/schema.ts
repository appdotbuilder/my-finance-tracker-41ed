import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  pgEnum, 
  date,
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const periodTypeEnum = pgEnum('period_type', ['weekly', 'monthly', 'yearly']);
export const investmentTypeEnum = pgEnum('investment_type', ['stock', 'mutual_fund', 'cryptocurrency', 'bond', 'etf', 'other']);
export const debtTypeEnum = pgEnum('debt_type', ['loan', 'credit_card', 'mortgage', 'personal_loan', 'other']);

// Users Table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  password_reset_token: text('password_reset_token'),
  password_reset_expires: timestamp('password_reset_expires'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transaction Categories Table
export const transactionCategoriesTable = pgTable('transaction_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: transactionTypeEnum('type').notNull(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions Table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  type: transactionTypeEnum('type').notNull(),
  category_id: integer('category_id').references(() => transactionCategoriesTable.id).notNull(),
  transaction_date: date('transaction_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Budgets Table
export const budgetsTable = pgTable('budgets', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  category_id: integer('category_id').references(() => transactionCategoriesTable.id), // Nullable for overall budgets
  budget_amount: numeric('budget_amount', { precision: 12, scale: 2 }).notNull(),
  period_type: periodTypeEnum('period_type').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Investments Table
export const investmentsTable = pgTable('investments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  type: investmentTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 8 }).notNull(), // High precision for crypto/fractional shares
  purchase_price: numeric('purchase_price', { precision: 12, scale: 2 }).notNull(),
  current_value: numeric('current_value', { precision: 12, scale: 2 }).notNull(),
  purchase_date: date('purchase_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Debts/Loans Table
export const debtsTable = pgTable('debts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  lender: text('lender').notNull(),
  debt_type: debtTypeEnum('debt_type').notNull(),
  original_amount: numeric('original_amount', { precision: 12, scale: 2 }).notNull(),
  current_balance: numeric('current_balance', { precision: 12, scale: 2 }).notNull(),
  interest_rate: numeric('interest_rate', { precision: 5, scale: 4 }).notNull(), // e.g., 5.25% = 0.0525
  minimum_payment: numeric('minimum_payment', { precision: 12, scale: 2 }).notNull(),
  due_date: date('due_date'), // Nullable for flexible repayment schedules
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
  categories: many(transactionCategoriesTable),
  budgets: many(budgetsTable),
  investments: many(investmentsTable),
  debts: many(debtsTable)
}));

export const transactionCategoriesRelations = relations(transactionCategoriesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [transactionCategoriesTable.user_id],
    references: [usersTable.id]
  }),
  transactions: many(transactionsTable),
  budgets: many(budgetsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  category: one(transactionCategoriesTable, {
    fields: [transactionsTable.category_id],
    references: [transactionCategoriesTable.id]
  })
}));

export const budgetsRelations = relations(budgetsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [budgetsTable.user_id],
    references: [usersTable.id]
  }),
  category: one(transactionCategoriesTable, {
    fields: [budgetsTable.category_id],
    references: [transactionCategoriesTable.id]
  })
}));

export const investmentsRelations = relations(investmentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [investmentsTable.user_id],
    references: [usersTable.id]
  })
}));

export const debtsRelations = relations(debtsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [debtsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type TransactionCategory = typeof transactionCategoriesTable.$inferSelect;
export type NewTransactionCategory = typeof transactionCategoriesTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type Budget = typeof budgetsTable.$inferSelect;
export type NewBudget = typeof budgetsTable.$inferInsert;

export type Investment = typeof investmentsTable.$inferSelect;
export type NewInvestment = typeof investmentsTable.$inferInsert;

export type Debt = typeof debtsTable.$inferSelect;
export type NewDebt = typeof debtsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  transactionCategories: transactionCategoriesTable,
  transactions: transactionsTable,
  budgets: budgetsTable,
  investments: investmentsTable,
  debts: debtsTable
};