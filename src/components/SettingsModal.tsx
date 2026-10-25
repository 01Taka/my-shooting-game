import { Maximize2, Minimize2, Settings, Volume2, VolumeX, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { useGameSettings } from "../stores/useGameSettings";

interface SettingsModalProps {
  onClose?: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useGameSettings();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ==========================================
  // ゲーム特有の設定画面カスタマイズ定義
  // （派生ゲーム作成時はここを編集）
  // ==========================================

  /**
   * 設定モーダルのヘッダー情報
   */
  const getModalHeader = () => ({
    title: "設定",
    icon: <Settings className="h-5 w-5 text-sky-400" />,
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };

        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }

        // 横画面に固定（対応端末）
        if (screen.orientation && "lock" in screen.orientation) {
          await (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } else {
        const doc = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
        };

        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  const handleClose = () => {
    settings.closeSettings();
    if (onClose) onClose();
  };

  const header = getModalHeader();

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm duration-200"
      onClick={handleClose}
    >
      {/* モーダル本体（クリックが背景の閉じる処理に伝播しないようstopPropagation） */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {header.icon}
            <h2 className="text-lg font-bold tracking-wide">{header.title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 設定項目セクション群 */}
        <div className="mt-4 space-y-4">
          {/* 全画面表示切り替え */}
          <div className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/60 p-3">
            <div>
              <div className="text-sm font-medium text-slate-200">画面表示</div>
              <div className="text-xs text-slate-400">
                {isFullscreen ? "全画面表示中" : "通常表示"}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow transition-all hover:bg-sky-500 active:scale-95"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span>全画面解除</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span>全画面にする</span>
                </>
              )}
            </button>
          </div>

          {/* BGM 音量 */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">BGM 音量</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={settings.toggleBgmMute}
                  className="rounded p-1 text-slate-400 transition-colors hover:text-white"
                >
                  {settings.bgmMuted || settings.bgmVolume === 0 ? (
                    <VolumeX className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-sky-400" />
                  )}
                </button>
                <span className="w-10 text-right font-mono text-xs text-slate-300">
                  {settings.bgmMuted ? "0%" : `${settings.bgmVolume}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.bgmMuted ? 0 : settings.bgmVolume}
              onChange={(e) => settings.setBgmVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
            />
          </div>

          {/* SE 音量 */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">SE（効果音）</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={settings.toggleSeMute}
                  className="rounded p-1 text-slate-400 transition-colors hover:text-white"
                >
                  {settings.seMuted || settings.seVolume === 0 ? (
                    <VolumeX className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-sky-400" />
                  )}
                </button>
                <span className="w-10 text-right font-mono text-xs text-slate-300">
                  {settings.seMuted ? "0%" : `${settings.seVolume}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.seMuted ? 0 : settings.seVolume}
              onChange={(e) => settings.setSeVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
            />
          </div>
        </div>

        {/* フッター閉じるボタン */}
        <div className="mt-5 flex justify-end border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
