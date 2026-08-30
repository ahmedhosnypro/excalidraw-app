import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import drizzle from "eslint-plugin-drizzle";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      "mini-services/**",
      "tests/**",
      "scripts/**",
      "download/**",
      "report/**",
      "storage/**",
      "db/**",
      "src/components/ui/**",
      "src/components/ui/**/*.ts",
      "src/components/ui/**/*.tsx",
      "src/hooks/use-toast.ts",
      "src/hooks/use-mobile.ts",
      "src/db/migrations/**",
      ".husky/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { drizzle },
    rules: {
      // ── TypeScript strictness ──────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // ── React ─────────────────────────────────────────────────────────
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",

      // ── Next.js ───────────────────────────────────────────────────────
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // ── General JavaScript quality ────────────────────────────────────
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "eqeqeq": ["error", "always"],
      "no-unused-vars": "off",
      "no-case-declarations": "off",
      "no-fallthrough": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unreachable": "off",
      "no-useless-escape": "off",
      "no-irregular-whitespace": "off",
    },
  },
  // ── Drizzle query safety ──────────────────────────────────────────────
  // Scoped to the DB/files layer only — the plugin's `.delete()` / `.update()`
  // pattern-matchers fire false positives on plain Map/array methods elsewhere.
  {
    files: ["src/lib/files.ts", "src/app/api/**/*.ts"],
    plugins: { drizzle },
    rules: {
      "drizzle/enforce-delete-with-where": "error",
      "drizzle/enforce-update-with-where": "error",
    },
  },
];

export default eslintConfig;
