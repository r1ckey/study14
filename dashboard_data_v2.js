const studyData = {
    title: "SQL Mastery",
    subtitle: "Architecture & Practical Playbook",
    localStorageKey: "sql_mastery_progress",
    themeColor: "#06b6d4",
    secondaryColor: "#3b82f6",
    axes: [
        {
            title: "Phase 1: Design Philosophy",
            modules: [
                { id: "1.1", title: "Kazaneya Architecture Model" },
                { id: "1.2", title: "Logical vs Physical Design" }
            ]
        },
        {
            title: "Phase 2: Cleansing & Prep",
            modules: [
                { id: "2.1", title: "Handling Duplicates (ROW_NUMBER)" },
                { id: "2.2", title: "Gap Filling (LEAD/LAG)" },
                { id: "2.3", title: "Flattening Arrays (EXPLODE)" }
            ]
        },
        {
            title: "Phase 3: Transformation",
            modules: [
                { id: "3.1", title: "Row to Column (PIVOT)" },
                { id: "3.2", title: "Time Series & Windows" },
                { id: "3.3", title: "Difference Extraction (EXCEPT)" }
            ]
        },
        {
            title: "Phase 4: ETL & Tuning",
            modules: [
                { id: "4.1", title: "MERGE INTO Anatomy" },
                { id: "4.2", title: "SCD Type 2 Implementation" },
                { id: "4.3", title: "Performance Troubleshooting" }
            ]
        }
    ]
};

const moduleContents = {
    "1.1": `# Kazaneya Architecture Model

> [!IMPORTANT]
> 複雑なSQLを書く時、いきなり SELECT から書き始めるのは地図を持たずに森に入るようなものです。
> 風音屋スタイルの「アウトプットから逆算する設計」を学びましょう。

## 1. 思考のプロセス
「インプット（生データ）」から出発するのではなく、「アウトプット（最終的に欲しい表）」から思考をスタートさせます。

1. **Output**: BIツールでどう見せたいか？（例: 10代のユーザーの月間視聴推移）
2. **Process**: それを作るために、どの粒度で集計し、どう結合するか？
3. **Input**: 必要なカラムはどのテーブルにあるか？

\`\`\`mermaid
graph TD
    subgraph 3. Input (Data Sources)
    A[View Logs]
    B[User Profile]
    C[Video Meta]
    end

    subgraph 2. Process (CTE Blocks)
    D[Filter by Age & Category]
    E[Aggregate by Month]
    end

    subgraph 1. Output (Dashboard)
    F[Monthly Trend Chart]
    end

    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    
    style F fill:#06b6d4,stroke:#fff,stroke-width:2px,color:#fff
\`\`\`

## 2. CTE（共通テーブル式）によるモジュール化
長いSQLは読みづらく、デバッグが困難です。 WITH 句を使い、意味のある「ブロック」に分割しましょう。

\`\`\`sql
WITH 
  /* ユーザー情報（年齢計算済み） */
  user_info AS (
    SELECT user_id, 2024 - birth_year AS age FROM users
  ),
  
  /* 視聴履歴とユーザー情報を結合 */
  view_history AS (
    SELECT v.video_id, u.age 
    FROM views v JOIN user_info u ON v.user_id = u.user_id
  )

-- 最終結果の抽出
SELECT age, COUNT(*) FROM view_history GROUP BY age;
\`\`\`

これにより、「どこで計算が間違っているのか」をブロック単位で特定できるようになります。`,

    "1.2": `# Logical vs Physical Design & Testing

> [!TIP]
> 分析クエリもソフトウェアです。テスト機能を持たないコードは、本番環境で確実に壊れます。
> CTEを使った「自己テスト機能付きクエリ」の書き方を紹介します。

## 1. テスト用 CTE の組み込み
最終的な SELECT の前に、意図的に test__ から始まるブロックを作成します。

\`\`\`sql
WITH 
  base_data AS (
    SELECT * FROM transactions WHERE amount > 0
  ),
  aggregated AS (
    SELECT user_id, SUM(amount) AS total FROM base_data GROUP BY 1
  ),
  
  -- ★ ここからテスト用ブロック
  test__check_null AS (
    SELECT COUNT(*) AS null_count FROM aggregated WHERE user_id IS NULL
  ),
  test__check_negative AS (
    SELECT COUNT(*) AS negative_count FROM aggregated WHERE total < 0
  )

-- 普段は最終結果をSELECTするが、
-- 開発中・バグ調査時は FROM test__check_null に切り替える
SELECT * FROM aggregated;
\`\`\`

## 2. 論理設計と物理（Catalyst）設計の分離
CTEでクエリを細かく分割すると「パフォーマンスが落ちるのでは？」と心配になるかもしれません。
しかし、Databricks（Spark Catalyst Optimizer）は非常に優秀です。

\`\`\`mermaid
graph LR
    subgraph 人間が見る論理構造
    A[CTE 1] --> B[CTE 2] --> C[CTE 3]
    end
    
    subgraph Catalystが実行する物理構造
    D[最適化された 1つのプロセス]
    end
    
    C -.->|コンパイル&最適化| D
\`\`\`

**結論:** パフォーマンスを気にして無理に短い（ネストされた）クエリを書く必要はありません。可読性と保守性を優先し、CTEでふんだんに分割しましょう。`,

    "2.1": `# Handling Duplicates (ROW_NUMBER)

> [!CAUTION]
> 「一意だと思っていたIDが重複していた」
> これにより JOIN 結果が爆発し、OOMを引き起こす事故は後を絶ちません。

## 1. ビジネスシナリオ
「ユーザーの住所履歴テーブルがある。複数回引っ越した人もいるが、**現在の最新の住所**だけを売上データに紐付けたい。」

## 2. NGなアプローチ (MAXとGROUP BY)
\`\`\`sql
-- 一旦最新の日付を出して、再度元のテーブルと結合する...
-- コードが長く、非常に遅い
SELECT a.* FROM address a
JOIN (SELECT id, MAX(date) as max_date FROM address GROUP BY id) b
ON a.id = b.id AND a.date = b.max_date
\`\`\`

## 3. ベストプラクティス：ROW_NUMBER()
データの「グループ（PARTITION）」ごとに、「順番（ORDER）」に背番号を振り、1番だけを抽出します。

\`\`\`sql
WITH numbered AS (
  SELECT 
    user_id,
    address,
    update_date,
    ROW_NUMBER() OVER (
      PARTITION BY user_id      -- 誰ごとに？ (グループ化)
      ORDER BY update_date DESC -- 新しい順に番号を振る
    ) as row_num
  FROM address_history
)
SELECT user_id, address FROM numbered WHERE row_num = 1;
\`\`\`

## 4. プロの技：QUALIFY句 (Databricks特有)
Databricks SQLでは、 QUALIFY を使うことで、CTEすら使わずに1文で記述できます。

\`\`\`sql
SELECT user_id, address, update_date 
FROM address_history
QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY update_date DESC) = 1;
\`\`\`
圧倒的にシンプルで、パフォーマンスも最適化されます。`,

    "2.2": `# Gap Filling (LEAD / LAG)

> [!IMPORTANT]
> 欠損している・または「入っていない」データを前後の情報から推測して埋める。
> 時系列分析で避けては通れない関門です。

## 1. ビジネスシナリオ
「IoTセンサーのデータ。ステータスが切り替わった時しかログが飛ばない（差分ログ）。ある特定の日のステータスを知りたいので、空欄（NULL）の場合は、直前の有効な値で穴埋めしたい。」

| Time | Status | (理想の結果) |
|---|---|---|
| 10:00 | Active | Active |
| 10:01 | NULL | Active (前を継承) |
| 10:05 | Error | Error |

## 2. 解決策：LAST_VALUE + IGNORE NULLS
標準的なSQLでは再帰クエリ等が必要で厄介ですが、 IGNORE NULLS を使うと一瞬で解決します。

\`\`\`sql
SELECT
  time,
  status,
  -- 現在行までの範囲で、NULLを無視して「一番最後の（＝最新の直近の）」値を取得
  LAST_VALUE(status) IGNORE NULLS OVER (
    ORDER BY time ASC
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS filled_status
FROM
  sensor_logs
\`\`\`

## 3. 次の行を取得する (LEAD / LAG)
「このイベントが起きてから、次のイベントが起きるまでの時間を知りたい」場合です。

\`\`\`sql
SELECT
  event_time,
  event_type,
  -- 次のイベント時間を取ってくる
  LEAD(event_time) OVER (ORDER BY event_time ASC) as next_event_time,
  
  -- 時間差分を計算
  datediff(
    second, 
    event_time, 
    LEAD(event_time) OVER (ORDER BY event_time ASC)
  ) as duration_seconds
FROM events
\`\`\` `,

    "2.3": `# Flattening Arrays (EXPLODE)

> [!TIP]
> 昨今のデータ基盤において、データは綺麗な表形式（RDB）で入ってくるとは限りません。
> JSONの配列（Array）を縦の行に展開する（Flattening）技術は必須です。

## 1. ビジネスシナリオ
「注文データに、購入アイテムが ["Apple", "Banana", "Orange"] のように配列として1つのカラムに入っている。これを商品ごとの売上ランキングにしたいので、1行1アイテムに分解したい。」

| Order ID | Items |
|---|---|
| 001 | ["A", "B"] |
| 002 | ["C"] |

これを以下に変えたい：
| Order ID | Item |
|---|---|
| 001 | A |
| 001 | B |
| 002 | C |

## 2. 解決策：EXPLODE
EXPLODE は、配列の中身を一つ一つ「爆発」させて、別々の行にしてくれます。

\`\`\`sql
SELECT
  order_id,
  item_name
FROM orders
-- 縦に展開する
LATERAL VIEW EXPLODE(items_array) AS item_name;

-- ※Databricks SQLの新しい書き方では、単語一つでも可能です
-- SELECT order_id, EXPLODE(items_array) AS item_name FROM orders;
\`\`\`

\`\`\`mermaid
graph LR
    A[Order 001: Array A, B] --> B(EXPLODE!)
    B --> C[Order 001: A]
    B --> D[Order 001: B]
\`\`\`

## 3. 位置情報も欲しい場合（POSEXPLODE）
配列の「何番目に入っていたか（順位など）」が必要な場合は POSEXPLODE を使います。

\`\`\`sql
SELECT
  order_id,
  pos AS array_index, -- 0, 1, 2... という要素のインデックス
  item_name
FROM orders
LATERAL VIEW POSEXPLODE(items_array) AS pos, item_name;
\`\`\` `,

    "3.1": `# Row to Column (PIVOT)

> [!IMPORTANT]
> DBのきれいな「縦持ち（正規化）」データを、ExcelやBIツールで集計しやすい「横持ち」に変換する。
> これを自在に行えるようになると、データマート作成の幅が圧倒的に広がります。

## 1. ビジネスシナリオ
「ユーザーからのアンケート回答が、Q1, Q2, Q3という形で縦に保存されている。これを機械学習のアルゴリズムに食わせるため、ユーザーごとに1行となる横持ちの『特徴量テーブル』に変換したい。」

### インプット（縦持ち）
| User_ID | Question | Answer |
|---|---|---|
| U1 | Q1 | Yes |
| U1 | Q2 | No |
| U2 | Q1 | No |

## 2. 解決策：PIVOT構文
PIVOT を使うと、指定した列の「値」が、新しい「カラム名」に昇格します。

\`\`\`sql
SELECT *
FROM (
  SELECT user_id, question_id, answer 
  FROM survey_results
)
PIVOT (
  -- 1. カラムに入れたい「値（集計結果）」
  MAX(answer) 
  -- 2. カラム名にしたい「元の列」
  FOR question_id IN (
    'Q1' AS answer_q1, 
    'Q2' AS answer_q2, 
    'Q3' AS answer_q3
  )
)
\`\`\`

## 3. なぜ MAX(answer) が必要なのか？
PIVOTの裏側では必ず「集計（GROUP BY）」が行われています。
文字列であっても、1ユーザーにつきQ1の答えは1つしか無い前提であれば、MAX() または MIN() をダミーの集計関数として使うのがセオリーです。

\`\`\`mermaid
table
    User_ID --> PIVOT_Engine
    Question --> PIVOT_Engine
    Answer --> PIVOT_Engine
    PIVOT_Engine --> Col_U1[U1 | Yes | No]
    PIVOT_Engine --> Col_U2[U2 | No | NULL]
\`\`\` `,

    "3.2": `# Time Series & Windows

> [!TIP]
> 過去30日間の移動平均や、累積売上高などを出す場合。
> JOINを多用したくなりますが、「Window関数」を使えばデータに触る回数を最小限に抑えられます。

## 1. ビジネスシナリオ
「日々の売上が乱高下するのでトレンドが見えない。過去7日間の移動平均（Moving Average）を算出してKPIダッシュボードに出したい。」

## 2. 解決策：ROWS BETWEEN
OVER 句の中に ROWS BETWEEN を指定することで、「計算対象とする窓（スライディングウィンドウ）」の範囲を定義できます。

\`\`\`sql
SELECT
  date,
  daily_sales,
  -- 過去6日 ＋ 当日 ＝ 7日間の平均
  AVG(daily_sales) OVER (
    ORDER BY date ASC
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS rolling_7d_avg
FROM
  retail_sales
ORDER BY date ASC;
\`\`\`

## 3. カレンダーの「空き」に注意 (RANGE vs ROWS)
売上がない日（レコードが存在しない日）がある場合、ROWS (行数) を指定すると、実際の「過去7日間」ではなく「過去にデータが存在した7日分」を拾ってしまいます。

厳密に「過去7日間（日付ベース）」で計算したい場合は、RANGE を使います。

\`\`\`sql
SELECT
  date,
  daily_sales,
  -- 日付の「値」として過去7日分を見る
  AVG(daily_sales) OVER (
    ORDER BY CAST(date AS TIMESTAMP) 
    RANGE BETWEEN INTERVAL 6 DAYS PRECEDING AND CURRENT ROW
  ) AS exact_7d_avg
FROM
  retail_sales;
\`\`\`
※Databricks SQL等では、日付型の RANGE 計算が完全にサポートされています。`,

    "3.3": `# Difference Extraction (EXCEPT)

> [!IMPORTANT]
> 「先月のリスト」と「今月のリスト」を比較して、退会した人・新規で入会した人のみをピックアップするテクニックです。

## 1. ビジネスシナリオ
「毎日数百万件のユーザーマスタが外部連携で送られてくる（全量スナップショット）。前日のリストと比較して、『新しく追加されたID』だけにウェルカムメールを送りたい。」

## 2. アプローチ1：EXCEPT (引き算)
2つの完全に同じ構造を持つクエリの結果同士を「引き算」します。

\`\`\`sql
-- 今月の全ユーザー (A)
SELECT user_id, email FROM users_this_month

EXCEPT

-- 先月の全ユーザー (B)
SELECT user_id, email FROM users_last_month

-- => (A - B) の結果、今月だけの新規ユーザーが出力される
\`\`\`

## 3. アプローチ2：LEFT ANTI JOIN
より実務的で高速なのが ANTI JOIN です。これは「左側のテーブルにはあるが、右側には**存在しない**データ」を抽出するJOIN方式です。

\`\`\`sql
SELECT 
  t.user_id, 
  t.email 
FROM 
  users_this_month t
LEFT ANTI JOIN 
  users_last_month l 
  ON t.user_id = l.user_id;
\`\`\`

\`\`\`mermaid
graph LR
    subgraph This_Month
    A(ID:1)
    B(ID:2)
    C(ID:3)
    end
    
    subgraph Last_Month
    D(ID:1)
    E(ID:2)
    end
    
    A --> D
    B --> E
    C -- No Match! --> F((結果に出力: ID3))
    
    style F fill:#06b6d4,stroke:#fff,color:#fff
\`\`\`

### ✅ どちらを使うべきか？
- カラム全体での完全一致（差分）を見たい場合： **EXCEPT**
- 「特定のID」をキーにして不在をチェックしたい、またはパフォーマンスを極限まで高めたい場合： **LEFT ANTI JOIN**`,

    "4.1": `# MERGE INTO Anatomy

> [!CAUTION]
> UPDATE と INSERT を別々に実行していませんか？
> トランザクション処理において、途中でエラーが起きた際のリスクが極めて高くなります。

## 1. MERGE INTO とは？
「対象のデータが既にいれば更新（UPDATE）、いなければ追加（INSERT）」という、いわゆる **Upsert（アップサート）** 処理を1文で、かつACIDトランザクションの制約下で行う最強のコマンドです。

## 2. 構文の解剖（解体新書）

\`\`\`sql
-- ① どこを書き換えるか（ターゲット）
MERGE INTO silver.customer_master AS target

-- ② どのデータを持ち込むか（ソース）
USING (
  SELECT id, name, status 
  FROM bronze.daily_customer_extract
  WHERE is_valid = true
) AS source

-- ③ 何をもって「同一人物」と判定するか（キー照合）
ON target.id = source.id

-- ④ 一致した場合の処理（UPDATE）
WHEN MATCHED AND source.status != target.status THEN 
  -- ※無駄な更新を防ぐため AND 条件を入れるのがプロの技
  UPDATE SET 
    target.name = source.name,
    target.status = source.status,
    target.updated_at = current_timestamp()

-- ⑤ 一致しなかった場合の処理（INSERT）
WHEN NOT MATCHED THEN
  INSERT (id, name, status, created_at)
  VALUES (source.id, source.name, source.status, current_timestamp());
\`\`\`

## 3. なぜ MERGE が重要なのか？
冪等性（べきとうせい）が担保されるためです。
ジョブが途中で落ちて再実行となっても、「重複してINSERTされる」事故が起きず、何度実行しても必ず同じ「正しい状態」に着地します。データパイプラインにおける必須スキルです。`,

    "4.2": `# SCD Type 2 Implementation

> [!IMPORTANT]
> 顧客の会員ランクは「通常」から「プレミアム」に変わる。
> しかし、過去の売上分析をする時は「売れた当時のランク」で計算したい。
> この履歴管理の課題を解決するのが SCD (Slowly Changing Dimension) Type 2 です。

## 1. SCD Type 2 の概念
データを上書き（Type 1）するのではなく、「有効開始日（valid_from）」と「有効終了日（valid_to）」、さらに「最新フラグ（is_current）」を持たせることで履歴を管理します。

| ID | ランク | valid_from | valid_to | is_current |
|---|---|---|---|---|
| 01 | 通常 | 2022-01-01 | 2023-06-01 | FALSE |
| 01 | ﾌﾟﾚﾐｱﾑ | 2023-06-01 | 9999-12-31 | TRUE |

## 2. Databricksでの実装 (MERGEの応用)
Type 2の実装は通常の MERGE よりも少し複雑です。なぜなら、「古い行を無効化（UPDATE）」しつつ、「新しい行を追加（INSERT）」するという2つのアクションが必要だからです。

\`\`\`sql
-- 非常に簡略化したイメージ構造
MERGE INTO dim_customer AS target
USING (
  -- 既存データのUPDATE用と、新規データのINSERT用のフラグを持たせたソースを準備
  SELECT * FROM source_data
) AS source
ON target.id = source.id 
   AND target.is_current = true

-- 既存の有効レコードと一致し、値が変わっていれば「古くする（無効化）」
WHEN MATCHED AND target.rank != source.rank THEN
  UPDATE SET 
    target.is_current = false,
    target.valid_to = current_timestamp()

-- 新しいデータは常にINSERT（ただし、古い行の無効化とは別のロジックやUNION等で工夫が必要になります）
\`\`\`

## 3. 実務での裏技（DLT APPLY CHANGES）
Type 2のMERGEをSQLでゼロから書くのはバグの温床です。
Databricksでは、**Delta Live Tables (DLT)** の APPLY CHANGES INTO を使うと、履歴管理（Type 2）をパラメータ指定だけで自動で行ってくれます。

\`\`\`python
# これだけでType 2の履歴管理テーブルが完成する
dlt.apply_changes(
  target = "dim_customer_history",
  source = "customer_cdc_stream",
  keys = ["id"],
  sequence_by = dlt.expr("update_timestamp"),
  stored_as_scd_type = "2"
)
\`\`\`
実務では、自作コードにこだわらず、強力なフレームワークの機能を最大限に活用することが正解です。`,

    "4.3": `# Performance Troubleshooting

> [!CAUTION]
> 「クエリがいつまで経っても終わらない」
> 「OOM（OutOfMemory）で落ちる」
> 誰もが経験するこの現象に対し、盲目的に「サーバーを大きくする」のではなく、実行計画から原因を特定しましょう。

## 1. 致命的な原因：Cross Join (直積)
JOINの ON 条件が抜けていたり、無意味な評価（ON 1=1）になっていたりすると、表Aの全行と表Bの全行を総当たりで掛け合わせます。
- 10万行 × 10万行 ＝ 100億行（即死レベル）

**解決策**: 
- 必ず意味のあるキーで INNER JOIN / LEFT JOIN をする。
- 星型スキーマ（Star Schema）を徹底し、トランザクション側の粒度を無駄に膨らませない。

## 2. 致命的な原因：Data Skew (データの偏り)
特定の id（例えば NULL や "Web" といった大量のレコードを持つ値）が特定のタスクに集中し、1つのCPUコアだけがパンクする現象です。

\`\`\`mermaid
graph TD
    A[Shuffle / JOIN] --> B[Core 1: 50MB]
    A --> C[Core 2: 120MB]
    A --> D[Core 3: 15GB]
    
    D -.-> E((OOM Crash))
\`\`\`

**解決策**:
Databricks環境であれば、Adaptive Query Execution (AQE) のスキュー最適化オプションをONにします。

\`\`\`sql
SET spark.sql.adaptive.enabled = true;
SET spark.sql.adaptive.skewJoin.enabled = true;
\`\`\`

## 3. パフォーマンス改善の小技集
1. **事前にフィルタリング**: JOIN の前に、CTE等で不要な行（特定年代のみなど）を WHERE で絞り落としておく（Data Skippingの活用）。
2. **Broadcast JOIN の強制**: 片方のテーブルが数万行程度と小さい場合は、シャッフルを回避するためヒントを使います。
   SELECT /*+ BROADCAST(dim_table) */ * FROM fact_table JOIN dim_table ...
3. **OPTIMIZE と ZORDER**: 頻繁に WHERE や JOIN に使われる列（日付やユーザーID）で物理的にデータを並べ替えておき、読み込み速度を劇的に向上させます。
   OPTIMIZE my_table ZORDER BY (user_id, event_date) `
};
