import { db } from '../db';
import { investmentsTable } from '../db/schema';
import { type Investment } from '../schema';
import { eq } from 'drizzle-orm';

export const getInvestments = async (userId: number): Promise<Investment[]> => {
  try {
    const results = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.user_id, userId))
      .execute();

    // Convert numeric fields back to numbers and dates to Date objects before returning
    return results.map(investment => ({
      ...investment,
      quantity: parseFloat(investment.quantity),
      purchase_price: parseFloat(investment.purchase_price),
      current_value: parseFloat(investment.current_value),
      purchase_date: new Date(investment.purchase_date)
    }));
  } catch (error) {
    console.error('Failed to fetch investments:', error);
    throw error;
  }
};