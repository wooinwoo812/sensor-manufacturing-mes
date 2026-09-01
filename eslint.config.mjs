import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "apps/api/src/generated/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.{js,mjs}", "eslint.config.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/api/**/*.ts", "apps/web/*.{ts,js}", "apps/web/**/*.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { "allowConstantExport": true }
      ]
    },
  },
);
