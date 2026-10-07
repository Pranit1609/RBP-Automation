import { test, expect } from '@playwright/test';
import { SecretMasker } from '../../src/utils/SecretMasker';

test.describe('Unit Test: SecretMasker', () => {
  test('maskSecret masks string values safely', () => {
    expect(SecretMasker.maskSecret('mySecretPassword123')).toBe('my****23');
    expect(SecretMasker.maskSecret('123')).toBe('****');
    expect(SecretMasker.maskSecret('')).toBe('[EMPTY]');
  });

  test('maskHeaders masks authorization, cookies, and api keys', () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer secret-jwt-token-12345',
      'X-Api-Key': 'key-abc-xyz',
      'Cookie': 'sessionId=abc123456789'
    };

    const masked = SecretMasker.maskHeaders(headers);

    expect(masked['Content-Type']).toBe('application/json');
    expect(masked['Authorization']).not.toContain('secret-jwt-token-12345');
    expect(masked['X-Api-Key']).not.toContain('key-abc-xyz');
    expect(masked['Cookie']).not.toContain('sessionId=abc123456789');
  });

  test('maskPayload recursively masks sensitive object keys', () => {
    const payload = {
      user: 'john',
      password: 'SuperSecretPassword',
      token: 'jwt.token.val',
      nested: {
        apiKey: '12345678'
      }
    };

    const masked = SecretMasker.maskPayload(payload);
    expect(masked.user).toBe('john');
    expect(masked.password).not.toContain('SuperSecretPassword');
    expect(masked.token).not.toContain('jwt.token.val');
    expect(masked.nested.apiKey).not.toContain('12345678');
  });
});
