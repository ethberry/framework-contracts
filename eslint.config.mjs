import globals from "globals";
import js from "@eslint/js";
import stylisticJs from "@stylistic/eslint-plugin-js";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import stylisticJsx from "@stylistic/eslint-plugin-jsx";
import eslintConfigPrettier from "eslint-config-prettier";
import tsEslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";

// DON'T disable any rules! Fix your shit!
export default [
  {
    ignores: ["**/artifacts", "**/cache", "**/coverage", "**/typechain-types", "**/.solcover.js"]
  },
  js.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ...tsEslint.configs.disableTypeChecked
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./contracts/*/tsconfig.json"
        ],
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.serviceworker,
        ...globals.browser
      }
    }
  },
  {
    plugins: {
      "@stylistic/ts": stylisticTs
    }
  },
  {
    files: ["**/*.{ts,tsx,mtsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_|NodeJS|ProcessEnv",
          argsIgnorePattern: "^_",
          args: "after-used",
          vars: "all"
        }
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "interface",
          format: ["PascalCase"],
          prefix: ["I"],
          filter: {
            match: false,
            regex: "^(ProcessEnv|Window)$"
          }
        }
      ]
    }
  },
  eslintConfigPrettier
];
