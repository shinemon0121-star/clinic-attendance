# Supabase セットアップ手順

## 1. Supabaseダッシュボードにアクセス
https://supabase.com/dashboard に移動してログイン

## 2. SQL スキーマをセットアップ
1. 左側メニューから「SQL Editor」をクリック
2. 「New Query」をクリック
3. `schema.sql` ファイル内のすべてのSQL文をコピーして貼り付け
4. 「Run」ボタンを押してテーブルを作成

## 3. 環境変数の確認
`.env.local` ファイルに以下の内容が含まれていることを確認：
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. 初期データの投入（オプション）
Supabase SQL Editor で以下を実行して初期ユーザーを追加：
```sql
INSERT INTO users (id, name, department, role, joined_date) VALUES
('fujiwara', '藤原慎太郎', 'CE（臨床工学部）', 'ADMIN', '2024-04-01'),
('tsukahara', '塚原蓮々', 'CE（臨床工学部）', 'STAFF', '2024-04-01');
```

## 5. RLS ポリシー (セキュリティ)
本番環境ではRLSを有効にしてください：
1. Supabaseダッシュボード → Authentication → Policies
2. 各テーブル（users, attendance_records, paid_leave_grants）に対して：
   - 認証ユーザーに対して SELECT/INSERT/UPDATE/DELETE を許可する設定を追加

## 6. トラブルシューティング
- **HTTP 400 エラー**: テーブルが存在しないか、スキーマが不正の可能性。`schema.sql` を再度実行。
- **接続失敗**: 環境変数を確認。`.env.local` に正しい URL とキーが設定されているか確認。
- **権限エラー**: RLS ポリシーを確認。上記 5 番の手順を実行。
