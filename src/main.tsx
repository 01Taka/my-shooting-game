import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { setupInputModeListener } from "./stores/useInputMode";

// PC/スマホ入力モードの動的自動検出リスナー
setupInputModeListener();

// iOS Safariなどのマルチタッチピンチズーム・ジェスチャ操作を防止
window.addEventListener("gesturestart", (e) => e.preventDefault());
window.addEventListener("gesturechange", (e) => e.preventDefault());
window.addEventListener("gestureend", (e) => e.preventDefault());

// 長押しや右クリックによるコンテキストメニュー表示を防止
window.addEventListener("contextmenu", (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
