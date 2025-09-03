import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  first_name: 'John',
  last_name: 'Doe'
};

const secondTestInput: CreateUserInput = {
  email: 'jane@example.com',
  password: 'janepassword456',
  first_name: 'Jane',
  last_name: 'Smith'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(0);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].password_hash).not.toEqual(testInput.password);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await createUser(testInput);

    // Verify password is properly hashed using Bun's password verification
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should prevent duplicate email registration', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Different',
      last_name: 'User'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should allow different users with different emails', async () => {
    // Create first user
    const firstUser = await createUser(testInput);
    
    // Create second user with different email
    const secondUser = await createUser(secondTestInput);

    // Both users should exist and be different
    expect(firstUser.id).not.toEqual(secondUser.id);
    expect(firstUser.email).toEqual('test@example.com');
    expect(secondUser.email).toEqual('jane@example.com');

    // Verify both users exist in database
    const users = await db.select()
      .from(usersTable)
      .execute();

    expect(users).toHaveLength(2);
    expect(users.find(u => u.email === 'test@example.com')).toBeDefined();
    expect(users.find(u => u.email === 'jane@example.com')).toBeDefined();
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});