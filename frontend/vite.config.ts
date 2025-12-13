import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    envDir: path.resolve(__dirname, ".."), // Look in parent directory
    server: {
        allowedHosts: ["queue.team1540.org"],
    },
});
