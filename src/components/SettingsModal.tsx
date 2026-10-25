import { Maximize2, Minimize2, Settings, Volume2, VolumeX, X } from "lucide-react";
import React, { useEffect, useState } from "react";

import { MAX_VOLUME, MIN_VOLUME } from "../constants";
import { useGameSettings } from "../stores/useGameSettings";
import { useInputMode } from "../stores/useInputMode";

interface SettingsModalProps {
  onClose?: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useGameSettings();
  const inputMode = useInputMode((s) => s.mode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // スマホ版では「カーソルを追従」はDisabled（元の設定値は維持）
  const isMobile = inputMode === "mobile";
  const cursorFollowActive = settings.followCursor;
  const cursorFollowDisabled = isMobile;

  // PC版かつカーソル追従が有効な場合、スティック操作はdisabled
  const joystickDisabled = inputMode === "pc" && settings.followCursor;

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
        const orientation = screen.orientation as
          | (ScreenOrientation & {
              lock?: (orientation: string) => Promise<void>;
            })
          | undefined;
        if (orientation && typeof orientation.lock === "function") {
          await orientation.lock("landscape").catch(() => {});
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
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm duration-200 sm:p-4"
      onClick={handleClose}
    >
      {/* モーダル本体（クリックが背景の閉じる処理に伝播しないようstopPropagation） */}
      <div
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 固定ヘッダー */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2">
            {header.icon}
            <h2 className="text-base font-bold tracking-wide sm:text-lg">{header.title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white active:scale-95"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* スクロール可能な設定項目セクション群（スマホのtouch-action対応） */}
        <div className="flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain py-3 pr-1">
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

          {/* カーソルを追従設定（PC版設定） */}
          <div
            className={`rounded-xl border border-slate-700/50 bg-slate-800/60 p-3 transition-opacity ${
              cursorFollowDisabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">カーソルを追従</span>
                  {isMobile && (
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                      スマホ版（無効）
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {cursorFollowActive ? "マウス位置へ直接エイム" : "マウス操作スティックを使用"}
                </div>
              </div>
              <button
                type="button"
                disabled={cursorFollowDisabled}
                onClick={settings.toggleFollowCursor}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  cursorFollowActive ? "bg-sky-600" : "bg-slate-700"
                } ${cursorFollowDisabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                aria-label="カーソルを追従の切り替え"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    cursorFollowActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              {isMobile
                ? "※ スマホ版では常に左右のバーチャルスティック操作が優先されます。"
                : cursorFollowActive
                  ? "マウスポインターの位置へ自機が直接エイムし、クリックで射撃します。"
                  : "マウスクリックでバーチャルスティックを倒して操作します。"}
            </div>
          </div>

          {/* スティック操作形式切り替え */}
          <div
            className={`rounded-xl border border-slate-700/50 bg-slate-800/60 p-3 transition-opacity ${
              joystickDisabled ? "opacity-50" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">スティック操作</span>
                {joystickDisabled && (
                  <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                    無効（カーソル追従中）
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {settings.joystickType === "dynamic" ? "指の位置に追従" : "画面端に固定"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={joystickDisabled}
                onClick={() => settings.setJoystickType("dynamic")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  settings.joystickType === "dynamic"
                    ? "bg-sky-600 text-white shadow"
                    : "bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white"
                } ${joystickDisabled ? "cursor-not-allowed" : ""}`}
              >
                追従（Dynamic）
              </button>
              <button
                type="button"
                disabled={joystickDisabled}
                onClick={() => settings.setJoystickType("fixed")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  settings.joystickType === "fixed"
                    ? "bg-sky-600 text-white shadow"
                    : "bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white"
                } ${joystickDisabled ? "cursor-not-allowed" : ""}`}
              >
                固定（Fixed）
              </button>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              {joystickDisabled
                ? "※ カーソル追従がONのため、スティック操作設定は無効化されています。"
                : settings.joystickType === "dynamic"
                  ? "タッチした位置からスティックが始まり、指の移動に合わせてベースが追従します。"
                  : "画面下部の定位置にあるスティックを操作します。"}
            </div>
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
              min={MIN_VOLUME}
              max={MAX_VOLUME}
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
              min={MIN_VOLUME}
              max={MAX_VOLUME}
              value={settings.seMuted ? 0 : settings.seVolume}
              onChange={(e) => settings.setSeVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
