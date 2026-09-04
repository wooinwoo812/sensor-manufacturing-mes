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
      "apps/web/src/app/routeTree.gen.ts",
      "apps/web/vendor/**",
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
        // TanStack Router 파일은 Route 상수와 화면 컴포넌트를 한 파일에 둔다(프레임워크 규약).
        { "allowConstantExport": true, "allowExportNames": ["Route"] }
      ]
    },
  },
);
