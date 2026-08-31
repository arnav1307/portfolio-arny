import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Vendored third-party components (pulled verbatim from a registry, e.g.
  // @dotmatrix). Kept byte-for-byte so they can be re-pulled or diffed against
  // upstream, which means they do not follow this repo's own lint rules.
  // Patching them to satisfy the linter would silently fork them.
  {
    files: ["components/vendor/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
