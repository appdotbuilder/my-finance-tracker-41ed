import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

const testUser = {
  email: 'test@example.com',
  password_hash: 'test_password_123', // In real app, this would be hashed
  first_name: 'John',
  last_name: 'Doe'
};

const loginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'test_password_123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.password_hash).toEqual('test_password_123');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const result = await loginUser({
      email: 'nonexistent@example.com',
      password: 'any_password'
    });

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser({
      email: 'test@example.com',
      password: 'wrong_password'
    });

    expect(result).toBeNull();
  });

  it('should return null for empty password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser({
      email: 'test@example.com',
      password: ''
    });

    expect(result).toBeNull();
  });

  it('should handle case-sensitive email correctly', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser({
      email: 'TEST@EXAMPLE.COM', // Different case
      password: 'test_password_123'
    });

    expect(result).toBeNull(); // Email should be case-sensitive
  });

  it('should authenticate different users with same password', async () => {
    // Create two test users with same password
    const user1 = {
      ...testUser,
      email: 'user1@example.com'
    };
    
    const user2 = {
      ...testUser,
      email: 'user2@example.com',
      first_name: 'Jane'
    };

    await db.insert(usersTable)
      .values([user1, user2])
      .execute();

    // Test first user
    const result1 = await loginUser({
      email: 'user1@example.com',
      password: 'test_password_123'
    });

    expect(result1).not.toBeNull();
    expect(result1!.email).toEqual('user1@example.com');
    expect(result1!.first_name).toEqual('John');

    // Test second user
    const result2 = await loginUser({
      email: 'user2@example.com',
      password: 'test_password_123'
    });

    expect(result2).not.toBeNull();
    expect(result2!.email).toEqual('user2@example.com');
    expect(result2!.first_name).toEqual('Jane');
  });

  it('should preserve all user fields in response', async () => {
    const userWithAllFields = {
      email: 'complete@example.com',
      password_hash: 'secure_password',
      first_name: 'Complete',
      last_name: 'User'
    };

    const insertResult = await db.insert(usersTable)
      .values(userWithAllFields)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    const result = await loginUser({
      email: 'complete@example.com',
      password: 'secure_password'
    });

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual(createdUser.email);
    expect(result!.password_hash).toEqual(createdUser.password_hash);
    expect(result!.first_name).toEqual(createdUser.first_name);
    expect(result!.last_name).toEqual(createdUser.last_name);
    expect(result!.created_at).toEqual(createdUser.created_at);
    expect(result!.updated_at).toEqual(createdUser.updated_at);
  });
});