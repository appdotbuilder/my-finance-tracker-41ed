import { db } from '../db';
import { debtsTable } from '../db/schema';
import { type UpdateDebtInput, type Debt } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDebt = async (input: UpdateDebtInput): Promise<Debt> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date() // Always update the timestamp
    };

    if (input.lender !== undefined) {
      updateData['lender'] = input.lender;
    }

    if (input.debt_type !== undefined) {
      updateData['debt_type'] = input.debt_type;
    }

    if (input.original_amount !== undefined) {
      updateData['original_amount'] = input.original_amount.toString();
    }

    if (input.current_balance !== undefined) {
      updateData['current_balance'] = input.current_balance.toString();
    }

    if (input.interest_rate !== undefined) {
      updateData['interest_rate'] = input.interest_rate.toString();
    }

    if (input.minimum_payment !== undefined) {
      updateData['minimum_payment'] = input.minimum_payment.toString();
    }

    if (input.due_date !== undefined) {
      updateData['due_date'] = input.due_date;
    }

    // Update the debt record
    const result = await db.update(debtsTable)
      .set(updateData)
      .where(eq(debtsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Debt with ID ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const debt = result[0];
    return {
      ...debt,
      original_amount: parseFloat(debt.original_amount),
      current_balance: parseFloat(debt.current_balance),
      interest_rate: parseFloat(debt.interest_rate),
      minimum_payment: parseFloat(debt.minimum_payment),
      due_date: debt.due_date ? new Date(debt.due_date) : null
    };
  } catch (error) {
    console.error('Debt update failed:', error);
    throw error;
  }
};