import { db } from '../db';
import { debtsTable } from '../db/schema';
import { type Debt } from '../schema';
import { eq, asc, isNull } from 'drizzle-orm';

export async function getDebts(userId: number): Promise<Debt[]> {
  try {
    // Query debts for the user, sorted by due_date (nulls last) then by created_at
    const results = await db.select()
      .from(debtsTable)
      .where(eq(debtsTable.user_id, userId))
      .orderBy(
        // Due dates first (nulls last), then by creation date
        asc(debtsTable.due_date),
        asc(debtsTable.created_at)
      )
      .execute();

    // Convert numeric fields back to numbers and dates to Date objects before returning
    return results.map(debt => ({
      ...debt,
      original_amount: parseFloat(debt.original_amount),
      current_balance: parseFloat(debt.current_balance),
      interest_rate: parseFloat(debt.interest_rate),
      minimum_payment: parseFloat(debt.minimum_payment),
      due_date: debt.due_date ? new Date(debt.due_date) : null
    }));
  } catch (error) {
    console.error('Failed to fetch debts:', error);
    throw error;
  }
}