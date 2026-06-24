import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // §11: cero `any` sin justificación comentada (un eslint-disable explícito).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Desactiva reglas de formato que colisionan con Prettier (debe ir al final).
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    // Service worker generado por Serwist (artefacto de build).
    "public/sw.js",
    "public/swe-worker-*.js",
    // Worker de pdf.js auto-alojado (vendor minificado; se copia en prebuild).
    "public/pdf/**",
  ]),
]);

export default eslintConfig;
