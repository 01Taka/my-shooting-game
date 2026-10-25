import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true, // npm run dev で自動的にブラウザが開く
    host: true, // スマホ実機（同じWi-Fi）からURLでテスト可能になる
  },
});
