import { z } from 'zod'

/**
 * TSDoc for Profile Schema Module
 *
 * Defines the validation rules for the user profile form.
 * Supports first name, last name, location, website, bio, and social handles.
 * All fields are optional but subject to specific validation rules (e.g. website URL format).
 */

/** Error message shown when a social handle field fails validation. */
export const SOCIAL_HANDLE_ERROR_MESSAGE =
  'Enter a bare handle (letters, numbers, underscores, periods, optional leading @) — not a full URL or a value with spaces.'

const HANDLE_PATTERN = /^@?[A-Za-z0-9_.+#]+$/

/**
 * True for a bare social handle (optionally prefixed with `@`): letters,
 * numbers, underscores, periods, `+` (international WhatsApp numbers), and
 * `#` (legacy Discord discriminators like `name#1234`) only. `undefined`/
 * `null`/`''` are treated as valid since the field is optional. Rejects
 * slashes and whitespace, which also rejects full URLs (they necessarily
 * contain `:` and `/`).
 */
export function isValidHandle(value: string | null | undefined): boolean {
  if (value == null || value === '') return true
  return HANDLE_PATTERN.test(value)
}

/** Optional http(s) URL, or an empty string/undefined. */
export const websiteSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true
      try {
        const url = new URL(val)
        return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname
      } catch {
        return false
      }
    },
    { message: 'Please enter a valid URL starting with http:// or https://' }
  )
  .optional()
  .or(z.literal(''))

/** Optional social handle: max 100 characters, must satisfy {@link isValidHandle}. */
export const socialHandleSchema = z
  .string()
  .max(100, { message: 'Handle must be 100 characters or less' })
  .optional()
  .or(z.literal(''))
  .refine((val) => isValidHandle(val), { message: SOCIAL_HANDLE_ERROR_MESSAGE })

export const profileSchema = z.object({
  firstName: z
    .string()
    .max(50, { message: 'First name must be 50 characters or less' })
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .max(50, { message: 'Last name must be 50 characters or less' })
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(100, { message: 'Location must be 100 characters or less' })
    .optional()
    .or(z.literal('')),
  website: websiteSchema,
  bio: z
    .string()
    .max(500, { message: 'Bio must be 500 characters or less' })
    .optional()
    .or(z.literal('')),
  telegram: socialHandleSchema,
  linkedin: socialHandleSchema,
  whatsapp: socialHandleSchema,
  twitter: socialHandleSchema,
  discord: socialHandleSchema,
})

/**
 * Type definition for the profile form data inferred from the schema.
 */
export type ProfileFormData = z.infer<typeof profileSchema>
