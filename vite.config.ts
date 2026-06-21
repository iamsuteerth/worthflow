import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

// Replicates Vercel's clean-URL behaviour in the dev server.
// /about → /about.html, /privacy → /privacy.html, etc.
const staticHtmlPlugin: Plugin = {
  name: "static-html-clean-urls",
  configureServer(server) {
    const staticRoutes = ["/about", "/privacy", "/terms", "/security"];
    server.middlewares.use((req, _res, next) => {
      const url = req.url?.split("?")[0] ?? "";
      if (staticRoutes.includes(url)) {
        req.url = url + ".html";
      }
      next();
    });
  },
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
    staticHtmlPlugin,
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
          if (id.includes("@google/genai") || id.includes("google/genai")) {
            return "ai-vendor";
          }
          // Markdown rendering is only used by the (lazy) AI chat. Keep its
          // sizeable dependency tree out of the main bundle.
          if (
            id.includes("react-markdown") ||
            id.includes("remark-") ||
            id.includes("micromark") ||
            id.includes("mdast") ||
            id.includes("hast") ||
            id.includes("unified") ||
            id.includes("/unist-") ||
            id.includes("vfile") ||
            id.includes("property-information") ||
            id.includes("decode-named-character-reference")
          ) {
            return "markdown-vendor";
          }
        },
      },
    },
  },
});