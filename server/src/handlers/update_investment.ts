import { db } from '../db';
import { investmentsTable } from '../db/schema';
import { type UpdateInvestmentInput, type Investment } from '../schema';
import { eq } from 'drizzle-orm';

export const updateInvestment = async (input: UpdateInvestmentInput): Promise<Investment> => {
  try {
    // Check if investment exists
    const existingInvestment = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, input.id))
      .execute();

    if (existingInvestment.length === 0) {
      throw new Error(`Investment with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    
    if (input.quantity !== undefined) {
      updateData.quantity = input.quantity.toString();
    }
    
    if (input.purchase_price !== undefined) {
      updateData.purchase_price = input.purchase_price.toString();
    }
    
    if (input.current_value !== undefined) {
      updateData.current_value = input.current_value.toString();
    }
    
    if (input.purchase_date !== undefined) {
      updateData.purchase_date = input.purchase_date;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the investment
    const result = await db.update(investmentsTable)
      .set(updateData)
      .where(eq(investmentsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers and dates to Date objects before returning
    const investment = result[0];
    return {
      ...investment,
      quantity: parseFloat(investment.quantity),
      purchase_price: parseFloat(investment.purchase_price),
      current_value: parseFloat(investment.current_value),
      purchase_date: new Date(investment.purchase_date),
      created_at: new Date(investment.created_at),
      updated_at: new Date(investment.updated_at)
    };
  } catch (error) {
    console.error('Investment update failed:', error);
    throw error;
  }
};