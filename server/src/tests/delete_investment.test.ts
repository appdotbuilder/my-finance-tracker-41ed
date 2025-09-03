import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, investmentsTable } from '../db/schema';
import { deleteInvestment } from '../handlers/delete_investment';
import { eq } from 'drizzle-orm';

describe('deleteInvestment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an investment successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create test investment
    const investmentResult = await db.insert(investmentsTable)
      .values({
        user_id: userId,
        name: 'Apple Inc.',
        type: 'stock',
        quantity: '10.50000000',
        purchase_price: '150.25',
        current_value: '1577.63',
        purchase_date: '2023-01-15'
      })
      .returning()
      .execute();

    const investmentId = investmentResult[0].id;

    // Delete the investment
    const result = await deleteInvestment(investmentId, userId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify investment is deleted from database
    const investments = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, investmentId))
      .execute();

    expect(investments).toHaveLength(0);
  });

  it('should return false when investment does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const nonExistentInvestmentId = 9999;

    // Try to delete non-existent investment
    const result = await deleteInvestment(nonExistentInvestmentId, userId);

    // Should return false for unsuccessful deletion
    expect(result).toBe(false);
  });

  it('should return false when investment belongs to different user', async () => {
    // Create first user
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Jane',
        last_name: 'Smith'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create investment for user1
    const investmentResult = await db.insert(investmentsTable)
      .values({
        user_id: user1Id,
        name: 'Tesla Inc.',
        type: 'stock',
        quantity: '5.00000000',
        purchase_price: '200.00',
        current_value: '1000.00',
        purchase_date: '2023-02-01'
      })
      .returning()
      .execute();

    const investmentId = investmentResult[0].id;

    // Try to delete user1's investment as user2
    const result = await deleteInvestment(investmentId, user2Id);

    // Should return false for unsuccessful deletion
    expect(result).toBe(false);

    // Verify investment still exists in database
    const investments = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, investmentId))
      .execute();

    expect(investments).toHaveLength(1);
    expect(investments[0].user_id).toBe(user1Id);
  });

  it('should only delete the specified investment', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create multiple test investments
    const investment1Result = await db.insert(investmentsTable)
      .values({
        user_id: userId,
        name: 'Apple Inc.',
        type: 'stock',
        quantity: '10.00000000',
        purchase_price: '150.00',
        current_value: '1500.00',
        purchase_date: '2023-01-15'
      })
      .returning()
      .execute();

    const investment2Result = await db.insert(investmentsTable)
      .values({
        user_id: userId,
        name: 'Microsoft Corp.',
        type: 'stock',
        quantity: '5.00000000',
        purchase_price: '250.00',
        current_value: '1250.00',
        purchase_date: '2023-02-01'
      })
      .returning()
      .execute();

    const investment1Id = investment1Result[0].id;
    const investment2Id = investment2Result[0].id;

    // Delete only the first investment
    const result = await deleteInvestment(investment1Id, userId);

    expect(result).toBe(true);

    // Verify only first investment is deleted
    const investment1Query = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, investment1Id))
      .execute();

    const investment2Query = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, investment2Id))
      .execute();

    expect(investment1Query).toHaveLength(0);
    expect(investment2Query).toHaveLength(1);
    expect(investment2Query[0].name).toBe('Microsoft Corp.');
  });

  it('should handle different investment types correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'John',
        last_name: 'Doe'
      })
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Test with cryptocurrency investment
    const cryptoResult = await db.insert(investmentsTable)
      .values({
        user_id: userId,
        name: 'Bitcoin',
        type: 'cryptocurrency',
        quantity: '0.25000000',
        purchase_price: '45000.00',
        current_value: '11250.00',
        purchase_date: '2023-03-01'
      })
      .returning()
      .execute();

    const cryptoId = cryptoResult[0].id;

    // Delete the cryptocurrency investment
    const result = await deleteInvestment(cryptoId, userId);

    expect(result).toBe(true);

    // Verify deletion
    const cryptoQuery = await db.select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, cryptoId))
      .execute();

    expect(cryptoQuery).toHaveLength(0);
  });
});