/** @type {import('jest').Config} */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Path to the Next.js app to load next.config.* and .env files
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",

  testMatch: [
    "**/__tests__/**/*.(spec|test).(ts|tsx|js|jsx)",
    "**/*.(spec|test).(ts|tsx|js|jsx)",
  ],

  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/dist/", "/out/"],

  verbose: true,

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  collectCoverageFrom: [
    "app/**/*.{ts,tsx,js,jsx}",
    "components/**/*.{ts,tsx,js,jsx}",
    "lib/**/*.{ts,tsx,js,jsx}",
    "!**/*.d.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);
