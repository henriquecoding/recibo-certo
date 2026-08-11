import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` é uma fronteira interpretada pelo Next. Nos testes
      // unitários, aponta para um módulo vazio sem alterar o build de produção.
      "server-only": path.resolve(__dirname, "./tests/server-only-stub.ts"),
    },
  },
});
