import { db } from '../db';
import { budgetsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateBudgetInput, type Budget } from '../schema';

export async function updateBudget(input: UpdateBudgetInput): Promise<Budget> {
  try {
    // Build the update object with only the fields that are provided
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    
    if (input.category_id !== undefined) {
      updateData['category_id'] = input.category_id;
    }
    
    if (input.budget_amount !== undefined) {
      updateData['budget_amount'] = input.budget_amount.toString(); // Convert number to string for numeric column
    }
    
    if (input.period_type !== undefined) {
      updateData['period_type'] = input.period_type;
    }
    
    if (input.start_date !== undefined) {
      updateData['start_date'] = input.start_date;
    }
    
    if (input.end_date !== undefined) {
      updateData['end_date'] = input.end_date;
    }
    
    // Always update the updated_at timestamp
    updateData['updated_at'] = new Date();

    // Update the budget record
    const result = await db.update(budgetsTable)
      .set(updateData)
      .where(eq(budgetsTable.id, input.id))
      .returning()
      .execute();

    // Check if budget was found and updated
    if (result.length === 0) {
      throw new Error(`Budget with ID ${input.id} not found`);
    }

    // Convert numeric fields and handle date conversion
    const budget = result[0];
    return {
      id: budget.id,
      user_id: budget.user_id,
      name: budget.name,
      category_id: budget.category_id,
      budget_amount: parseFloat(budget.budget_amount), // Convert string back to number
      period_type: budget.period_type,
      start_date: new Date(budget.start_date), // Convert string to Date
      end_date: new Date(budget.end_date), // Convert string to Date
      created_at: budget.created_at,
      updated_at: budget.updated_at
    };
  } catch (error) {
    console.error('Budget update failed:', error);
    throw error;
  }
}