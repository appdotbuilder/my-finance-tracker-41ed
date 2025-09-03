import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, investmentsTable } from '../db/schema';
import { getInvestments } from '../handlers/get_investments';

describe('getInvestments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no investments', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const result = await getInvestments(user.id);

    expect(result).toEqual([]);
  });

  it('should return investments for a specific user', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create investments for both users
    const testDate = new Date('2024-01-15');
    const testDateString = '2024-01-15';
    
    await db.insert(investmentsTable)
      .values([
        {
          user_id: user1.id,
          name: 'Apple Stock',
          type: 'stock',
          quantity: '10.5',
          purchase_price: '150.00',
          current_value: '1650.00',
          purchase_date: testDateString
        },
        {
          user_id: user1.id,
          name: 'Bitcoin',
          type: 'cryptocurrency',
          quantity: '0.25',
          purchase_price: '45000.00',
          current_value: '12000.00',
          purchase_date: testDateString
        },
        {
          user_id: user2.id,
          name: 'Tesla Stock',
          type: 'stock',
          quantity: '5.0',
          purchase_price: '200.00',
          current_value: '1100.00',
          purchase_date: testDateString
        }
      ])
      .execute();

    const result = await getInvestments(user1.id);

    expect(result).toHaveLength(2);
    
    // Verify proper numeric conversion
    expect(typeof result[0].quantity).toBe('number');
    expect(typeof result[0].purchase_price).toBe('number');
    expect(typeof result[0].current_value).toBe('number');
    
    // Find specific investments
    const appleStock = result.find(inv => inv.name === 'Apple Stock');
    const bitcoin = result.find(inv => inv.name === 'Bitcoin');
    
    expect(appleStock).toBeDefined();
    expect(appleStock!.type).toBe('stock');
    expect(appleStock!.quantity).toBe(10.5);
    expect(appleStock!.purchase_price).toBe(150.00);
    expect(appleStock!.current_value).toBe(1650.00);
    expect(appleStock!.purchase_date).toEqual(testDate);
    
    expect(bitcoin).toBeDefined();
    expect(bitcoin!.type).toBe('cryptocurrency');
    expect(bitcoin!.quantity).toBe(0.25);
    expect(bitcoin!.purchase_price).toBe(45000.00);
    expect(bitcoin!.current_value).toBe(12000.00);
  });

  it('should not return investments for other users', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'One'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'User',
        last_name: 'Two'
      })
      .returning()
      .execute();

    // Create investment for user2 only
    await db.insert(investmentsTable)
      .values({
        user_id: user2.id,
        name: 'Tesla Stock',
        type: 'stock',
        quantity: '5.0',
        purchase_price: '200.00',
        current_value: '1100.00',
        purchase_date: '2024-01-15'
      })
      .execute();

    const result = await getInvestments(user1.id);

    expect(result).toHaveLength(0);
  });

  it('should handle various investment types correctly', async () => {
    // Create a user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    const testDateString = '2024-01-15';

    // Create investments of different types
    await db.insert(investmentsTable)
      .values([
        {
          user_id: user.id,
          name: 'S&P 500 ETF',
          type: 'etf',
          quantity: '50.0',
          purchase_price: '400.00',
          current_value: '22000.00',
          purchase_date: testDateString
        },
        {
          user_id: user.id,
          name: 'Vanguard Index Fund',
          type: 'mutual_fund',
          quantity: '100.0',
          purchase_price: '120.00',
          current_value: '13500.00',
          purchase_date: testDateString
        },
        {
          user_id: user.id,
          name: 'Government Bond',
          type: 'bond',
          quantity: '1.0',
          purchase_price: '1000.00',
          current_value: '1050.00',
          purchase_date: testDateString
        },
        {
          user_id: user.id,
          name: 'Real Estate Investment',
          type: 'other',
          quantity: '1.0',
          purchase_price: '50000.00',
          current_value: '55000.00',
          purchase_date: testDateString
        }
      ])
      .execute();

    const result = await getInvestments(user.id);

    expect(result).toHaveLength(4);
    
    const types = result.map(inv => inv.type).sort();
    expect(types).toEqual(['bond', 'etf', 'mutual_fund', 'other']);
    
    // Verify all have proper numeric conversions
    result.forEach(investment => {
      expect(typeof investment.quantity).toBe('number');
      expect(typeof investment.purchase_price).toBe('number');
      expect(typeof investment.current_value).toBe('number');
      expect(investment.created_at).toBeInstanceOf(Date);
      expect(investment.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle high precision quantities correctly', async () => {
    // Create a user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create investment with high precision quantity (typical for crypto)
    await db.insert(investmentsTable)
      .values({
        user_id: user.id,
        name: 'Bitcoin',
        type: 'cryptocurrency',
        quantity: '0.12345678', // 8 decimal places
        purchase_price: '50000.00',
        current_value: '5000.00',
        purchase_date: '2024-01-15'
      })
      .execute();

    const result = await getInvestments(user.id);

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(0.12345678);
    expect(typeof result[0].quantity).toBe('number');
  });
});