import { db } from '../db';
import { investmentsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteInvestment(investmentId: number, userId: number): Promise<boolean> {
  try {
    // Delete the investment, ensuring it belongs to the user
    const result = await db.delete(investmentsTable)
      .where(and(
        eq(investmentsTable.id, investmentId),
        eq(investmentsTable.user_id, userId)
      ))
      .returning()
      .execute();

    // Return true if one record was deleted, false otherwise
    return result.length === 1;
  } catch (error) {
    console.error('Investment deletion failed:', error);
    throw error;
  }
}