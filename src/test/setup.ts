// Vitest global setup. Registers @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveTextContent, etc.) and auto-cleans the DOM
// between tests so render() calls don't leak across specs.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
