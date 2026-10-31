# AI組織コード構造概要

本ドキュメントは、AI組織システムをフロントエンドとバックエンドのコンポーネントに分類した共有用概要です。

## フロントエンド (app/AiDashboard/)
ユーザーインターフェースとAI機能との対話層。

- `app/AiDashboard/index.tsx`: ダッシュボードのメインエントリーポイント。
- `app/AiDashboard/types.ts`: AI関連の型定義。
- `app/AiDashboard/components/`: UIコンポーネント群。
  - `ChatPanel.tsx`: AIとのチャットインターフェース。
  - `DeskViews.tsx`: AIエージェントのデスクビュー。
  - `DocumentReport.tsx`: AI生成ドキュメントの表示。
  - `Sidebar.tsx`: ナビゲーションサイドバー。

## バックエンド (app/api/, lib/ai/)
AIロジック、エージェント実行、データ処理、パイプライン管理層。

- `app/api/ai/`: AIエンドポイント。
  - `chat/`: チャットAPI。
  - `intelligence/`: 知能化処理・エージェント基盤。
    - `agents/`: 各種専門エージェント（`chiefManager.ts`, `snsAccount.ts`, `marketTrend.ts` 等）。
    - `helpers.ts`: 知能化用ユーティリティ。
  - `knowledge/`: 知識管理API。
  - `publish/`: 公開処理API。
- `app/api/pipeline/`: 自動化パイプライン制御。
  - `types.ts`, `gates/`, `start/`, `status/`, `worker/`: パイプライン実行・監視管理。
- `app/api/cron/`: 定期実行バッチ処理。
  - `intelligence/`: 知能処理の定期実行。
- `lib/ai/`: 共有AIユーティリティ。
  - `helpers.ts`: AI処理基盤ユーティリティ。
