import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Flat config. Next 16 removed `next lint`, so linting runs through the
// ESLint CLI (`npm run lint`) and is no longer part of `next build`.
export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
  {
    extends: [...nextCoreWebVitals],
  },
]);
