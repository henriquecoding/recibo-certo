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
      // `server-only` é um marcador do Next: importá-lo faz o BUILD falhar se
      // um componente de cliente puxar o módulo. Essa garantia vive no build,
      // que é onde interessa — mas o pacote não resolve fora dele, e sem este
      // atalho nenhum módulo `.server.ts` protegido podia ser testado.
      "server-only": path.resolve(__dirname, "./tests/server-only-stub.ts"),
    },
  },
});
