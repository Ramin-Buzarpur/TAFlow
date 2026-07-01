import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ["node_modules/**", ".next/**", "prisma/migrations/**", "playwright-report/**", "test-results/**"]
  }
];

export default eslintConfig;
