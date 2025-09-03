import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionCategoriesTable } from '../db/schema';
import { type CreateTransactionCategoryInput } from '../schema';
import { createTransactionCategory } from '../handlers/create_transaction_category';
import { eq, and } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  first_name: 'Test',
  last_name: 'User'
};

// Test input data
const testInput: CreateTransactionCategoryInput = {
  name: 'Groceries',
  type: 'expense',
  user_id: 1 // Will be updated after user creation
};

describe('createTransactionCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transaction category for a valid user', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const categoryInput = { ...testInput, user_id: userId };

    const result = await createTransactionCategory(categoryInput);

    // Validate returned category
    expect(result.name).toEqual('Groceries');
    expect(result.type).toEqual('expense');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save transaction category to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const categoryInput = { ...testInput, user_id: userId };

    const result = await createTransactionCategory(categoryInput);

    // Query database to verify category was saved
    const savedCategories = await db.select()
      .from(transactionCategoriesTable)
      .where(eq(transactionCategoriesTable.id, result.id))
      .execute();

    expect(savedCategories).toHaveLength(1);
    expect(savedCategories[0].name).toEqual('Groceries');
    expect(savedCategories[0].type).toEqual('expense');
    expect(savedCategories[0].user_id).toEqual(userId);
    expect(savedCategories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create income category successfully', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const incomeInput: CreateTransactionCategoryInput = {
      name: 'Salary',
      type: 'income',
      user_id: userId
    };

    const result = await createTransactionCategory(incomeInput);

    expect(result.name).toEqual('Salary');
    expect(result.type).toEqual('income');
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
  });

  it('should allow different users to have categories with the same name', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'test2@example.com'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create same category name for both users
    const category1Input = { ...testInput, user_id: user1Id };
    const category2Input = { ...testInput, user_id: user2Id };

    const result1 = await createTransactionCategory(category1Input);
    const result2 = await createTransactionCategory(category2Input);

    expect(result1.name).toEqual('Groceries');
    expect(result2.name).toEqual('Groceries');
    expect(result1.user_id).toEqual(user1Id);
    expect(result2.user_id).toEqual(user2Id);
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput = { ...testInput, user_id: 99999 };

    await expect(createTransactionCategory(invalidInput))
      .rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should throw error when category name already exists for the same user', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const categoryInput = { ...testInput, user_id: userId };

    // Create first category
    await createTransactionCategory(categoryInput);

    // Try to create duplicate category
    await expect(createTransactionCategory(categoryInput))
      .rejects.toThrow(/Category with name 'Groceries' already exists for this user/i);
  });

  it('should create multiple different categories for the same user', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create different categories
    const groceriesInput = { name: 'Groceries', type: 'expense', user_id: userId } as const;
    const salaryInput = { name: 'Salary', type: 'income', user_id: userId } as const;
    const transportInput = { name: 'Transport', type: 'expense', user_id: userId } as const;

    const groceriesResult = await createTransactionCategory(groceriesInput);
    const salaryResult = await createTransactionCategory(salaryInput);
    const transportResult = await createTransactionCategory(transportInput);

    // Verify all categories were created
    expect(groceriesResult.name).toEqual('Groceries');
    expect(groceriesResult.type).toEqual('expense');
    
    expect(salaryResult.name).toEqual('Salary');
    expect(salaryResult.type).toEqual('income');
    
    expect(transportResult.name).toEqual('Transport');
    expect(transportResult.type).toEqual('expense');

    // Verify they all have different IDs
    expect(groceriesResult.id).not.toEqual(salaryResult.id);
    expect(groceriesResult.id).not.toEqual(transportResult.id);
    expect(salaryResult.id).not.toEqual(transportResult.id);

    // Verify all belong to the same user
    expect(groceriesResult.user_id).toEqual(userId);
    expect(salaryResult.user_id).toEqual(userId);
    expect(transportResult.user_id).toEqual(userId);
  });

  it('should handle case-sensitive category names correctly', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create categories with different cases
    const lowerInput = { name: 'groceries', type: 'expense', user_id: userId } as const;
    const upperInput = { name: 'GROCERIES', type: 'expense', user_id: userId } as const;
    const mixedInput = { name: 'Groceries', type: 'expense', user_id: userId } as const;

    const lowerResult = await createTransactionCategory(lowerInput);
    const upperResult = await createTransactionCategory(upperInput);
    const mixedResult = await createTransactionCategory(mixedInput);

    // All should be created successfully as they are case-sensitive different
    expect(lowerResult.name).toEqual('groceries');
    expect(upperResult.name).toEqual('GROCERIES');
    expect(mixedResult.name).toEqual('Groceries');

    // Verify they all have different IDs
    expect(lowerResult.id).not.toEqual(upperResult.id);
    expect(lowerResult.id).not.toEqual(mixedResult.id);
    expect(upperResult.id).not.toEqual(mixedResult.id);
  });
});