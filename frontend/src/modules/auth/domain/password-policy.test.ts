import { describe, expect, it } from 'vitest';
import { validateStrongPassword } from './password-policy';

describe('validateStrongPassword', () => {
  it('accepts a 12-character password with every required character group', () => {
    expect(validateStrongPassword('SecurePass1!')).toBeNull();
  });

  it.each([
    ['too short', 'Short1!'],
    ['no lowercase', 'SECUREPASS12!'],
    ['no uppercase', 'securepass12!'],
    ['no number', 'SecurePassword!'],
    ['unsupported special character', 'SecurePass12_'],
  ])('rejects %s', (_description, password) => {
    expect(validateStrongPassword(password)).not.toBeNull();
  });
});
