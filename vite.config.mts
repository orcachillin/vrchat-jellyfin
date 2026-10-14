import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    root: "client",
    base: "/assets",
    plugins: [react(), tailwindcss()],
    build: {
        target: "esnext",
        outDir: "../dist/client",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js",
                assetFileNames: "[name].[ext]",
                sourcemapFileNames: "[name].js.map",
            },
        }
    }
});