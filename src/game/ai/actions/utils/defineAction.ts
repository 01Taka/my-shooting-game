import type { EnemyBase } from "../../EnemyBase";
import type { ActionResult, BoundAction, GameContext } from "../../types";

/**
 * 型安全なアクション定義ヘルパー
 * `initData` の戻り値から `TData` を推論し、型消去済みインターフェース `BoundAction` を返す
 */
export function defineAction<TData, TArgs = void>(def: {
  initData: (enemy: EnemyBase, context: GameContext, args: TArgs) => TData;
  update: (
    enemy: EnemyBase,
    context: GameContext,
    data: TData,
    args: TArgs,
    delta: number,
  ) => ActionResult;
  onReset?: (enemy: EnemyBase, data: TData, args: TArgs) => void;
}): (args: TArgs) => BoundAction {
  return (args: TArgs) => ({
    init: (enemy, context) => def.initData(enemy, context, args),
    update: (enemy, context, data, delta) => def.update(enemy, context, data as TData, args, delta),
    onReset: def.onReset ? (enemy, data) => def.onReset!(enemy, data as TData, args) : undefined,
  });
}
