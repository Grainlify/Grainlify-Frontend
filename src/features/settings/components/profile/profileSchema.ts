import { z } from 'zod';

/**
 * Validates social handle fields.
 * Accepts alphanumerics, underscores, and dots, with an optional leading '@'.
 * Rejects slashes, whitespace, and full URLs.
 * Allows empty strings or undefined for optional inputs.
 */
export const isValidHandle = (val?: string | null): boolean => {
  if (!val || val === '') return true;
  return /^@?[a-zA-Z0-9_.]+$/.test(val);
};

export const SOCIAL_HANDLE_ERROR_MESSAGE =
  'Social handle must not contain slashes, whitespace, or full URLs';

export const socialHandleSchema = z
  .string()
  .max(100, 'Handle must be at most 100 characters')
  .optional()
  .or(z.literal(''))
  .refine(isValidHandle, {
    message: SOCIAL_HANDLE_ERROR_MESSAGE,
  });

export const websiteSchema = z
  .string()
  .max(255, 'Website URL must be at most 255 characters')
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid http(s):// URL' }
  );

export const profileSchema = z.object({
  firstName: z.string().max(100, 'First name is too long').optional().or(z.literal('')),
  lastName: z.string().max(100, 'Last name is too long').optional().or(z.literal('')),
  first_name: z.string().max(100, 'First name is too long').optional().or(z.literal('')),
  last_name: z.string().max(100, 'Last name is too long').optional().or(z.literal('')),
  location: z.string().max(150, 'Location is too long').optional().or(z.literal('')),
  website: websiteSchema,
  bio: z.string().max(500, 'Bio is too long').optional().or(z.literal('')),
  telegram: socialHandleSchema,
  linkedin: socialHandleSchema,
  whatsapp: socialHandleSchema,
  twitter: socialHandleSchema,
  discord: socialHandleSchema,
});

export type ProfileFormData = z.infer<typeof profileSchema>;
