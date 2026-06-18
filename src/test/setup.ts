/**
 * Global test setup, loaded by Vitest before every test file.
 *
 * - Registers `@testing-library/jest-dom` matchers (e.g. `toBeDisabled`,
 *   `toBeInTheDocument`).
 * - Automatically unmounts React trees rendered during a test so state does
 *   not leak between cases.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
