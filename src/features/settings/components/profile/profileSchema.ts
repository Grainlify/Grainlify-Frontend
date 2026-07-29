import { z } from 'zod'

/**
 * TSDoc for Profile Schema Module
 *
 * Defines the validation rules for the user profile form.
 * Supports first name, last name, location, website, bio, and social handles.
 * All fields are optional but subject to specific validation rules (e.g. website URL format).
 */

/** Shared error message shown when a social handle field fails format validation. */
export const SOCIAL_HANDLE_ERROR_MESSAGE =
  'Enter a bare handle (letters, numbers, "." or "_"), with an optional leading @ — not a URL or slash-separated path.'

/** A bare handle: optional leading "@", then letters, digits, "_", or "." — no slashes, whitespace, or embedded "@". */
const HANDLE_PATTERN = /^@?[A-Za-z0-9_.]+$/

/**
 * Validates a social handle value. `undefined`, `null`, and `''` are treated
 * as valid since every social field is optional; otherwise the value must be
 * a bare handle (optionally prefixed with "@") — no slashes, whitespace, or
 * full URLs.
 */
export function isValidHandle(value: string | null | undefined): boolean {
  if (value === undefined || value === null || value === '') return true
  return HANDLE_PATTERN.test(value)
}

/**
 * Reusable schema for a single social-platform handle field. Shared by every
 * social field on {@link profileSchema} so all platforms get the same
 * length cap and handle-format validation.
 */
export const socialHandleSchema = z
  .string()
  .max(100, { message: 'Handle must be 100 characters or less' })
  .optional()
  .or(z.literal(''))
  .refine((val) => isValidHandle(val), { message: SOCIAL_HANDLE_ERROR_MESSAGE })

/** Reusable schema for the website field: a valid absolute http(s) URL, or empty. */
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
