import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { investmentsTable, usersTable } from '../db/schema';
import { type CreateInvestmentInput } from '../schema';
import { createInvestment } from '../handlers/create_investment';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe'
};

// Simple test input
const testInput: CreateInvestmentInput = {
  user_id: 1,
  name: 'Apple Stock',
  type: 'stock',
  quantity: 10.5,
  purchase_price: 150.25,
  current_value: 160.75,
  purchase_date: new Date('2023-01-15')
};

describe('createInvestment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an investment', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createInvestment(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.name).toEqual('Apple Stock');
    expect(result.type).toEqual('stock');
    expect(result.quantity).toEqual(10.5);
    expect(typeof result.quantity).toEqual('number');
    expect(result.purchase_price).toEqual(150.25);
    expect(typeof result.purchase_price).toEqual('number');
    expect(result.current_value).toEqual(160.75);
    expect(typeof result.current_value).toEqual('number');
    expect(result.purchase_date).toEqual(new Date('2023-01-15'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save investment to database', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await createInvestment(testInput);

    // Query using proper drizzle syntax
    const investments = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, result.id))
      .execute();

    expect(investments).toHaveLength(1);
    expect(investments[0].name).toEqual('Apple Stock');
    expect(investments[0].type).toEqual('stock');
    expect(parseFloat(investments[0].quantity)).toEqual(10.5);
    expect(parseFloat(investments[0].purchase_price)).toEqual(150.25);
    expect(parseFloat(investments[0].current_value)).toEqual(160.75);
    expect(investments[0].purchase_date).toEqual('2023-01-15');
    expect(investments[0].created_at).toBeInstanceOf(Date);
    expect(investments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle cryptocurrency investment with high precision', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const cryptoInput: CreateInvestmentInput = {
      user_id: 1,
      name: 'Bitcoin',
      type: 'cryptocurrency',
      quantity: 0.12345678, // High precision for crypto
      purchase_price: 45000.99,
      current_value: 48500.50,
      purchase_date: new Date('2023-06-01')
    };

    const result = await createInvestment(cryptoInput);

    expect(result.name).toEqual('Bitcoin');
    expect(result.type).toEqual('cryptocurrency');
    expect(result.quantity).toEqual(0.12345678);
    expect(result.purchase_price).toEqual(45000.99);
    expect(result.current_value).toEqual(48500.50);
  });

  it('should handle different investment types', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const investmentTypes: Array<CreateInvestmentInput['type']> = [
      'stock', 'mutual_fund', 'cryptocurrency', 'bond', 'etf', 'other'
    ];

    for (const type of investmentTypes) {
      const input: CreateInvestmentInput = {
        user_id: 1,
        name: `Test ${type}`,
        type: type,
        quantity: 5.0,
        purchase_price: 100.0,
        current_value: 105.0,
        purchase_date: new Date('2023-01-01')
      };

      const result = await createInvestment(input);
      expect(result.type).toEqual(type);
      expect(result.name).toEqual(`Test ${type}`);
    }
  });

  it('should throw error for non-existent user', async () => {
    const inputWithInvalidUser: CreateInvestmentInput = {
      ...testInput,
      user_id: 999 // User that doesn't exist
    };

    expect(createInvestment(inputWithInvalidUser)).rejects.toThrow(/User with ID 999 not found/i);
  });

  it('should handle fractional shares correctly', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const fractionalInput: CreateInvestmentInput = {
      user_id: 1,
      name: 'Tesla Fractional',
      type: 'stock',
      quantity: 2.75, // Fractional shares
      purchase_price: 800.333,
      current_value: 850.666,
      purchase_date: new Date('2023-03-10')
    };

    const result = await createInvestment(fractionalInput);

    expect(result.quantity).toEqual(2.75);
    expect(result.purchase_price).toBeCloseTo(800.333, 2);
    expect(result.current_value).toBeCloseTo(850.666, 2);
    
    // Verify in database
    const savedInvestment = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, result.id))
      .execute();

    expect(parseFloat(savedInvestment[0].quantity)).toEqual(2.75);
    expect(parseFloat(savedInvestment[0].purchase_price)).toBeCloseTo(800.333, 2);
    expect(parseFloat(savedInvestment[0].current_value)).toBeCloseTo(850.666, 2);
  });

  it('should create multiple investments for same user', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const investment1: CreateInvestmentInput = {
      user_id: 1,
      name: 'Apple Stock',
      type: 'stock',
      quantity: 10,
      purchase_price: 150.0,
      current_value: 160.0,
      purchase_date: new Date('2023-01-01')
    };

    const investment2: CreateInvestmentInput = {
      user_id: 1,
      name: 'Google Stock',
      type: 'stock',
      quantity: 5,
      purchase_price: 2500.0,
      current_value: 2600.0,
      purchase_date: new Date('2023-02-01')
    };

    const result1 = await createInvestment(investment1);
    const result2 = await createInvestment(investment2);

    expect(result1.name).toEqual('Apple Stock');
    expect(result2.name).toEqual('Google Stock');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both are saved in database
    const allInvestments = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.user_id, 1))
      .execute();

    expect(allInvestments).toHaveLength(2);
  });
});