import type { NextConfig } from "next";
const config: NextConfig = {
  // Os PDFs de referência são servidos de /referencia via rota própria.
  outputFileTracingIncludes: { "/referencia/[arquivo]": ["./referencia/**/*"] },
};
export default config;
