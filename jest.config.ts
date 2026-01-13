/**
 * Intentionally keep this file as a tiny JS-exporting config so Jest does NOT
 * require `ts-node` to load configuration.
 *
 * This effectively replaces the previous TypeScript-based config that caused:
 *   "ts-node is required for the TypeScript configuration files"
 *
 * Note:
 * - Even though the file extension is `.ts`, we avoid TS syntax and use
 *   `module.exports` to keep Jest happy without extra loaders.
 */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "**/__tests__/**/*.(spec|test).(ts|tsx|js|jsx)",
    "**/*.(spec|test).(ts|tsx|js|jsx)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/dist/", "/out/"],
  verbose: true,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx,js,jsx}",
    "components/**/*.{ts,tsx,js,jsx}",
    "lib/**/*.{ts,tsx,js,jsx}",
    "!**/*.d.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
