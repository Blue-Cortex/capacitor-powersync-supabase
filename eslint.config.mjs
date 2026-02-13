import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { fixupPluginRules } from "@eslint/compat";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  // 1. GLOBAL IGNORES
  // This must be the first object and have ONLY an ignores key
  {
    ignores: [
      "**/dist/**",
      "**/android/**",
      "**/ios/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/DerivedData/**",
      "**/build/**",
      "example-app/**",
      "**/*.config.*",
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs"
    ]
  },

  // 2. BASE CONFIGURATIONS
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. REACT & PROJECT SPECIFIC
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: fixupPluginRules(reactPlugin),
      "react-hooks": fixupPluginRules(hooksPlugin),
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: "19.2",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off"
    },
  },

  // 4. PRETTIER
  prettierConfig,
];