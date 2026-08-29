-- 既存のRLSポリシーに以下を追加

-- Users can update own items (主にdraft状態の削除や変更用)
CREATE POLICY "Users can update own items" ON items 
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own items
CREATE POLICY "Users can delete own items" ON items 
  FOR DELETE USING (auth.uid() = user_id);