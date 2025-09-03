import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, investmentsTable } from '../db/schema';
import { type UpdateInvestmentInput } from '../schema';
import { updateInvestment } from '../handlers/update_investment';
import { eq } from 'drizzle-orm';
describe('updateInvestment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testInvestmentId: number;

  beforeEach(async () => {
    // Create test user directly in database
    const userResult = await db.insert(usersTable)
      .values({
        email: 'investor@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Investor'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test investment
    const result = await db.insert(investmentsTable)
      .values({
        user_id: testUserId,
        name: 'Original Stock',
        type: 'stock',
        quantity: '100.00000000',
        purchase_price: '50.00',
        current_value: '55.00',
        purchase_date: '2023-01-01'
      })
      .returning()
      .execute();

    testInvestmentId = result[0].id;
  });

  it('should update investment with all fields', async () => {
    const updateInput: UpdateInvestmentInput = {
      id: testInvestmentId,
      name: 'Updated Stock',
      type: 'etf',
      quantity: 150.50,
      purchase_price: 60.75,
      current_value: 65.25,
      purchase_date: new Date('2023-06-01')
    };

    const result = await updateInvestment(updateInput);

    expect(result.id).toBe(testInvestmentId);
    expect(result.name).toBe('Updated Stock');
    expect(result.type).toBe('etf');
    expect(result.quantity).toBe(150.5);
    expect(result.purchase_price).toBe(60.75);
    expect(result.current_value).toBe(65.25);
    expect(result.purchase_date).toEqual(new Date('2023-06-01'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const updateInput: UpdateInvestmentInput = {
      id: testInvestmentId,
      current_value: 75.50,
      quantity: 120
    };

    const result = await updateInvestment(updateInput);

    // Updated fields
    expect(result.current_value).toBe(75.5);
    expect(result.quantity).toBe(120);
    
    // Original fields should remain unchanged
    expect(result.name).toBe('Original Stock');
    expect(result.type).toBe('stock');
    expect(result.purchase_price).toBe(50);
    expect(result.purchase_date).toEqual(new Date('2023-01-01'));
  });

  it('should update current_value only for portfolio tracking', async () => {
    const updateInput: UpdateInvestmentInput = {
      id: testInvestmentId,
      current_value: 48.25
    };

    const result = await updateInvestment(updateInput);

    expect(result.current_value).toBe(48.25);
    
    // All other fields should remain unchanged
    expect(result.name).toBe('Original Stock');
    expect(result.type).toBe('stock');
    expect(result.quantity).toBe(100);
    expect(result.purchase_price).toBe(50);
    expect(result.purchase_date).toEqual(new Date('2023-01-01'));
  });

  it('should save updated investment to database', async () => {
    const updateInput: UpdateInvestmentInput = {
      id: testInvestmentId,
      name: 'Database Test Stock',
      current_value: 82.50
    };

    await updateInvestment(updateInput);

    // Verify changes were saved to database
    const investments = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, testInvestmentId))
      .execute();

    expect(investments).toHaveLength(1);
    expect(investments[0].name).toBe('Database Test Stock');
    expect(parseFloat(investments[0].current_value)).toBe(82.5);
    expect(investments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle high precision quantities for crypto', async () => {
    const updateInput: UpdateInvestmentInput = {
      id: testInvestmentId,
      type: 'cryptocurrency',
      quantity: 0.12345678,
      current_value: 45000.75
    };

    const result = await updateInvestment(updateInput);

    expect(result.type).toBe('cryptocurrency');
    expect(result.quantity).toBe(0.12345678);
    expect(result.current_value).toBe(45000.75);
  });

  it('should throw error when investment does not exist', async () => {
    const updateInput: UpdateInvestmentInput = {
      id: 99999,
      current_value: 100
    };

    expect(updateInvestment(updateInput)).rejects.toThrow(/Investment with id 99999 not found/i);
  });

  it('should update investment with all supported investment types', async () => {
    const investmentTypes = ['stock', 'mutual_fund', 'cryptocurrency', 'bond', 'etf', 'other'] as const;

    for (const type of investmentTypes) {
      const updateInput: UpdateInvestmentInput = {
        id: testInvestmentId,
        type: type,
        name: `Test ${type}`
      };

      const result = await updateInvestment(updateInput);
      
      expect(result.type).toBe(type);
      expect(result.name).toBe(`Test ${type}`);
    }
  });

  it('should handle date updates correctly', async () => {
    const newPurchaseDate = new Date('2024-01-15');
    const updateInput: UpdateInvestmentInput = {
      id: testInvestmentId,
      purchase_date: newPurchaseDate
    };

    const result = await updateInvestment(updateInput);

    expect(result.purchase_date).toEqual(newPurchaseDate);
  });
});