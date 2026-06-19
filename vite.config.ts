import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("aws-amplify") || id.includes("@aws-sdk")) {
            return "aws-vendor";
          }
          if (id.includes("recharts")) {
            return "recharts";
          }
        },
      },
    },
  },
});