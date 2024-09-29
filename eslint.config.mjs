import typescriptRules from "@ethberry/eslint-config/presets/tsx.mjs";
import mochaRules from "@ethberry/eslint-config/tests/mocha.mjs";

export default [
  {
    ignores: [
      "**/dist",
      "**/artifacts",
      "**/cache",
      "**/coverage",
      "**/typechain-types"
    ]
  },

  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.eslint.json", "./contracts/*tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  ...typescriptRules,
  ...mochaRules,
];
