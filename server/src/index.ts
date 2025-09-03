import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginUserInputSchema,
  createTransactionCategoryInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  createBudgetInputSchema,
  updateBudgetInputSchema,
  createInvestmentInputSchema,
  updateInvestmentInputSchema,
  createDebtInputSchema,
  updateDebtInputSchema,
  getFinancialSummaryInputSchema,
  getCategorySpendingInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createTransactionCategory } from './handlers/create_transaction_category';
import { getTransactionCategories } from './handlers/get_transaction_categories';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { createBudget } from './handlers/create_budget';
import { getBudgets } from './handlers/get_budgets';
import { updateBudget } from './handlers/update_budget';
import { deleteBudget } from './handlers/delete_budget';
import { createInvestment } from './handlers/create_investment';
import { getInvestments } from './handlers/get_investments';
import { updateInvestment } from './handlers/update_investment';
import { deleteInvestment } from './handlers/delete_investment';
import { createDebt } from './handlers/create_debt';
import { getDebts } from './handlers/get_debts';
import { updateDebt } from './handlers/update_debt';
import { deleteDebt } from './handlers/delete_debt';
import { getFinancialSummary } from './handlers/get_financial_summary';
import { getCategorySpending } from './handlers/get_category_spending';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User Authentication
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Transaction Categories
  createTransactionCategory: publicProcedure
    .input(createTransactionCategoryInputSchema)
    .mutation(({ input }) => createTransactionCategory(input)),
  
  getTransactionCategories: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTransactionCategories(input.userId)),

  // Transactions
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  getTransactions: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTransactions(input.userId)),
  
  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),
  
  deleteTransaction: publicProcedure
    .input(z.object({ transactionId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteTransaction(input.transactionId, input.userId)),

  // Budgets
  createBudget: publicProcedure
    .input(createBudgetInputSchema)
    .mutation(({ input }) => createBudget(input)),
  
  getBudgets: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getBudgets(input.userId)),
  
  updateBudget: publicProcedure
    .input(updateBudgetInputSchema)
    .mutation(({ input }) => updateBudget(input)),
  
  deleteBudget: publicProcedure
    .input(z.object({ budgetId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteBudget(input.budgetId, input.userId)),

  // Investments
  createInvestment: publicProcedure
    .input(createInvestmentInputSchema)
    .mutation(({ input }) => createInvestment(input)),
  
  getInvestments: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getInvestments(input.userId)),
  
  updateInvestment: publicProcedure
    .input(updateInvestmentInputSchema)
    .mutation(({ input }) => updateInvestment(input)),
  
  deleteInvestment: publicProcedure
    .input(z.object({ investmentId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteInvestment(input.investmentId, input.userId)),

  // Debts/Loans
  createDebt: publicProcedure
    .input(createDebtInputSchema)
    .mutation(({ input }) => createDebt(input)),
  
  getDebts: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDebts(input.userId)),
  
  updateDebt: publicProcedure
    .input(updateDebtInputSchema)
    .mutation(({ input }) => updateDebt(input)),
  
  deleteDebt: publicProcedure
    .input(z.object({ debtId: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteDebt(input.debtId, input.userId)),

  // Reports & Analytics
  getFinancialSummary: publicProcedure
    .input(getFinancialSummaryInputSchema)
    .query(({ input }) => getFinancialSummary(input)),
  
  getCategorySpending: publicProcedure
    .input(getCategorySpendingInputSchema)
    .query(({ input }) => getCategorySpending(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance Management TRPC server listening at port: ${port}`);
}

start();