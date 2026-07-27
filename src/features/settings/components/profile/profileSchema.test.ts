import { describe, it, expect } from 'vitest';
import {
  profileSchema,
  isValidHandle,
  socialHandleSchema,
  websiteSchema,
  SOCIAL_HANDLE_ERROR_MESSAGE,
} from './profileSchema';

describe('isValidHandle utility function', () => {
  it('allows undefined, null, and empty string', () => {
    expect(isValidHandle(undefined)).toBe(true);
    expect(isValidHandle(null)).toBe(true);
    expect(isValidHandle('')).toBe(true);
  });

  it('accepts valid bare handles', () => {
    expect(isValidHandle('john_doe')).toBe(true);
    expect(isValidHandle('user.name')).toBe(true);
    expect(isValidHandle('user123')).toBe(true);
  });

  it('accepts handles with a leading @', () => {
    expect(isValidHandle('@john_doe')).toBe(true);
    expect(isValidHandle('@user.name')).toBe(true);
    expect(isValidHandle('@user123')).toBe(true);
  });

  it('rejects values containing slashes', () => {
    expect(isValidHandle('john/doe')).toBe(false);
    expect(isValidHandle('@john/doe')).toBe(false);
  });

  it('rejects values containing whitespace', () => {
    expect(isValidHandle('john doe')).toBe(false);
    expect(isValidHandle(' john')).toBe(false);
    expect(isValidHandle('john ')).toBe(false);
    expect(isValidHandle('@john doe')).toBe(false);
  });

  it('rejects full URLs', () => {
    expect(isValidHandle('https://twitter.com/johndoe')).toBe(false);
    expect(isValidHandle('http://t.me/johndoe')).toBe(false);
    expect(isValidHandle('https://linkedin.com/in/johndoe')).toBe(false);
    expect(isValidHandle('https://wa.me/1234567890')).toBe(false);
    expect(isValidHandle('https://discord.gg/invite')).toBe(false);
  });

  it('rejects invalid character placements', () => {
    expect(isValidHandle('john@doe')).toBe(false);
    expect(isValidHandle('@john@doe')).toBe(false);
    expect(isValidHandle('john!doe')).toBe(false);
  });
});

describe('socialHandleSchema', () => {
  it('validates single social handle strings', () => {
    expect(socialHandleSchema.safeParse('barehandle').success).toBe(true);
    expect(socialHandleSchema.safeParse('@handlewithat').success).toBe(true);
    expect(socialHandleSchema.safeParse('').success).toBe(true);
    expect(socialHandleSchema.safeParse(undefined).success).toBe(true);

    const invalidResult = socialHandleSchema.safeParse('https://twitter.com/user');
    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues[0].message).toBe(SOCIAL_HANDLE_ERROR_MESSAGE);
    }
  });

  it('rejects handles exceeding max length of 100', () => {
    const longHandle = 'a'.repeat(101);
    const result = socialHandleSchema.safeParse(longHandle);
    expect(result.success).toBe(false);
  });
});

describe('websiteSchema', () => {
  it('accepts valid http and https URLs', () => {
    expect(websiteSchema.safeParse('https://example.com').success).toBe(true);
    expect(websiteSchema.safeParse('http://example.com').success).toBe(true);
    expect(websiteSchema.safeParse('').success).toBe(true);
    expect(websiteSchema.safeParse(undefined).success).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(websiteSchema.safeParse('not-a-url').success).toBe(false);
    expect(websiteSchema.safeParse('ftp://example.com').success).toBe(false);
  });
});

describe('profileSchema', () => {
  const socialFields = ['telegram', 'twitter', 'discord', 'linkedin', 'whatsapp'] as const;

  socialFields.forEach((field) => {
    describe(`Field validation: ${field}`, () => {
      it(`accepts empty/optional for ${field}`, () => {
        expect(profileSchema.safeParse({ [field]: '' }).success).toBe(true);
        expect(profileSchema.safeParse({ [field]: undefined }).success).toBe(true);
        expect(profileSchema.safeParse({}).success).toBe(true);
      });

      it(`accepts a valid bare handle for ${field}`, () => {
        const result = profileSchema.safeParse({ [field]: 'valid_handle.123' });
        expect(result.success).toBe(true);
      });

      it(`accepts a handle with a leading @ for ${field}`, () => {
        const result = profileSchema.safeParse({ [field]: '@valid_handle.123' });
        expect(result.success).toBe(true);
      });

      it(`rejects a value containing / for ${field}`, () => {
        const result = profileSchema.safeParse({ [field]: 'user/name' });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes(field));
          expect(issue).toBeDefined();
          expect(issue?.message).toBe(SOCIAL_HANDLE_ERROR_MESSAGE);
        }
      });

      it(`rejects a value containing whitespace for ${field}`, () => {
        const result = profileSchema.safeParse({ [field]: 'user name' });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes(field));
          expect(issue).toBeDefined();
          expect(issue?.message).toBe(SOCIAL_HANDLE_ERROR_MESSAGE);
        }
      });

      it(`rejects a full URL pasted into ${field}`, () => {
        const result = profileSchema.safeParse({
          [field]: `https://${field}.com/user/status/123`,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const issue = result.error.issues.find((i) => i.path.includes(field));
          expect(issue).toBeDefined();
          expect(issue?.message).toBe(SOCIAL_HANDLE_ERROR_MESSAGE);
        }
      });
    });
  });

  it('validates a complete valid profile', () => {
    const validProfile = {
      firstName: 'John',
      lastName: 'Doe',
      location: 'New York',
      website: 'https://johndoe.com',
      bio: 'Software Developer',
      telegram: '@johndoe_tg',
      linkedin: 'johndoe_li',
      whatsapp: '1234567890',
      twitter: '@johndoe_tw',
      discord: 'johndoe_dc',
    };
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });
});
