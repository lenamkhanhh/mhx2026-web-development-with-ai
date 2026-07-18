import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist", ".npm-cache"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser, parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: { ...js.configs.recommended.rules, ...reactHooks.configs.recommended.rules, "react-refresh/only-export-components": ["warn", { allowConstantExport: true }] }
  },
  {
    files: ["server/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
