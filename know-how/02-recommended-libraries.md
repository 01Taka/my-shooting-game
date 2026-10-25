# 小〜中規模ゲームに推奨されるライブラリ選定

Phaser × React 構成で小〜中規模のゲームを開発する際に、生産性と保守性を劇的に向上させるおすすめライブラリの一覧と選定理由です。

---

## 推奨ライブラリ一覧

| ライブラリ                    | 役割                   | 採用理由・メリット                                                                                                                                      |
| :---------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`zustand`**                 | ゲーム全体の状態管理   | React コンポーネント外（Phaser の Scene コールバック内）からでも `useGameSettings.getState()` で直接ステートの読み書きが可能。Context不要で極めて軽量。 |
| **`zod`**                     | データバリデーション   | LocalStorage に保存するセーブデータやハイスコア、設定項目の安全な型チェック・パース。                                                                   |
| **`lucide-react`**            | UIアイコン             | 全画面切替、音量ON/OFF、閉じるボタンなどの軽量SVGアイコン群。                                                                                           |
| **`canvas-confetti`**         | クリア・祝福エフェクト | ステージクリア時やハイスコア更新時に手軽に紙吹雪を打ち上げる。                                                                                          |
| **`clsx` / `tailwind-merge`** | スタイルユーティリティ | 状態に応じたTailwindクラスの動的結合や競合解消。                                                                                                        |

---

## 1. Zustand (状態管理)

### なぜ Redux や React Context ではなく Zustand なのか？

Phaser の Scene は React のレンダリングツリーの「外側」で動作します。React Context はコンポーネントツリーの内部でしか使えませんが、Zustand は **Vanilla JS（非React環境）からも直接ステートを取得・更新** できます。

```ts
// src/stores/useGameSettings.ts
import { create } from "zustand";

interface GameSettingsState {
  bgmVolume: number;
  isOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setBgmVolume: (vol: number) => void;
}

export const useGameSettings = create<GameSettingsState>((set) => ({
  bgmVolume: 80,
  isOpen: false,
  openSettings: () => set({ isOpen: true }),
  closeSettings: () => set({ isOpen: false }),
  setBgmVolume: (vol) => set({ bgmVolume: vol }),
}));
```

#### Phaser シーン内からの呼び出し例

```ts
// Reactフックを使えないPhaserのメソッド内でもそのまま実行可能
useGameSettings.getState().openSettings();
```

---

## 2. Zod (セーブデータ＆スキーマ検証)

LocalStorage から復元するハイスコアやゲーム設定が破損していたり、古いバージョンのフォーマットだった場合に、クラッシュを防ぎつつデフォルト値にフォールバックできます。

```ts
import { z } from "zod";

const SaveDataSchema = z.object({
  highScore: z.number().default(0),
  clearedStages: z.array(z.number()).default([]),
  soundVolume: z.number().min(0).max(100).default(80),
});

export function loadSaveData() {
  const raw = localStorage.getItem("game-save");
  if (!raw) return SaveDataSchema.parse({});

  try {
    return SaveDataSchema.parse(JSON.parse(raw));
  } catch {
    return SaveDataSchema.parse({});
  }
}
```

---

## 3. Lucide React (UIアイコン)

ゲームの設定画面、ポーズメニュー、HUD等で頻出するアイコン（音量、全画面、閉じる、一時停止など）をTree-shaking対応の超軽量SVGとして利用できます。

```tsx
import { Maximize2, Minimize2, Volume2, VolumeX, X } from "lucide-react";
```

---

## 4. Canvas Confetti (演出エフェクト)

ステージクリア時やハイスコア更新時に、軽量かつ美しい紙吹雪エフェクトを簡単に表示できます。

```ts
import confetti from "canvas-confetti";

export function triggerStageClearCelebration() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
}
```
