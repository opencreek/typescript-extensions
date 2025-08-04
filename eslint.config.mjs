import { defineConfig, globalIgnores } from "eslint/config"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import path from "node:path"
import { fileURLToPath } from "node:url"
import js from "@eslint/js"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default defineConfig([
  globalIgnores(["**/build/", "eslint.config.mjs"]),
  {
    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "prettier",
    ),

    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 11,
      sourceType: "module",

      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      "@typescript-eslint/no-explicit-any": 0,
      "@typescript-eslint/no-this-alias": 0,
      "@typescript-eslint/ban-ts-comment": 0,
      "@typescript-eslint/no-floating-promises": ["error"],
    },
  },
])
