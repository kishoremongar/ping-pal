import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import baseConfig from "./eslint/_base.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores (was .eslintignore)
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "node_modules/**",
      "eslint.config.mjs",
      "eslint/**",
      "nextEnv.d.ts",
      ".vscode",
      "**/*.test.*",
      "**/*.spec.*",
      "__tests__/**",
      "coverage/**",
      "*.config.js",
      "*.conf.js",
      "*.md",
      "*.svg",
      "*.jpg",
      "*.png",
      "*.gif",
      "*.ico",
      "*.webp",
      "*.woff",
      "*.woff2",
      "*.ttf",
      "*.eot",
      ".env*",
      "!.env.example",
    ],
  },

  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),

  ...baseConfig,

  // ✅ JS override
  {
    files: ["**/*.{js,jsx}"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  {
    rules: {},
  },
];

export default eslintConfig;
