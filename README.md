# 📘 SQL Mastery: Architecture & Practical Playbook

> **「単なる関数の暗記」から「データ基盤の設計」へ。**
> 実務で通用する堅牢なSQL設計思想と、Databricks/Delta Lakeの性能を最大限に引き出す実装パターンをマスターするためのプレイブックです。

---

## 🚀 構成ロードマップ

本カリキュラムは 4つのフェーズで構成されています。各ディレクトリには詳細な技術解説と実装コードが含まれています。

### [Phase 1: Design Philosophy (設計思想)](./Phase1/)
- [1.1: アウトプット逆算型アーキテクチャ](./Phase1/1.1_Output_Driven_Architecture.md)
- [1.2: 論理設計 vs 物理実装](./Phase1/1.2_Logical_vs_Physical_Design.md)

### [Phase 2: Cleansing & Prep (前処理技術)](./Phase2/)
- [2.1: 重複排除 (ROW_NUMBER)](./Phase2/2.1_Handling_Duplicates_ROW_NUMBER.md)
- [2.2: 欠損穴埋め (LEAD/LAG)](./Phase2/2.2_Gap_Filling_LEAD_LAG.md)
- [2.3: 配列データの展開 (EXPLODE)](./Phase2/2.3_Flattening_Arrays_EXPLODE.md)

### [Phase 3: Transformation (複雑な加工)](./Phase3/)
- [3.1: 縦横変換 (PIVOT)](./Phase3/3.1_Row_to_Column_PIVOT.md)
- [3.2: 時系列集計 (Window Frame)](./Phase3/3.2_Time_Series_and_Windows.md)
- [3.3: 差分抽出 (EXCEPT/ANTI JOIN)](./Phase3/3.3_Difference_Extraction_EXCEPT.md)

### [Phase 4: ETL & Tuning (運用と高速化)](./Phase4/)
- [4.1: Upsert処理 (MERGE INTO)](./Phase4/4.1_MERGE_INTO_Anatomy.md)
- [4.2: 履歴管理 (SCD Type 2)](./Phase4/4.2_SCD_Type_2_Implementation.md)
- [4.3: パフォーマンス・トラブルシューティング](./Phase4/4.3_Performance_Troubleshooting.md)

---

## 🎨 プレミアム・ポータル

ローカル環境または静的ホスティング環境では、専用の **[SQL Mastery Portal (index.html)](./index.html)** を使用して、リッチなUIで学習を進めることができます。

- **進捗管理**: 各モジュールの完了状態をブラウザに保存。
- **マスター・レーダーチャート**: 各フェーズの習得度を視覚化。
- **洗練されたダークモード**: エンジニアの集中力を高めるインターフェース。

---

## 🛠️ 開発・メンテナンス

コンテンツ（Markdown）を更新した後は、以下のコマンド（または同等のスクリプト）を実行してポータル用データを同期してください。

```bash
# 仕組み：各 .md ファイルの内容を JSON に統合し、portal_data.js を作成します
node build_portal.js
```

---
**Designed by Antigravity for Data Architects.**
