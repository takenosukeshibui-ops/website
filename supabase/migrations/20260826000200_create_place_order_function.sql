-- Create a secure transaction function to place an order
CREATE OR REPLACE FUNCTION public.place_order(user_id_input UUID)
RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
  draft_item_count INT;
BEGIN
  -- 1. カート内（draft）の対象アイテム件数を確認・行ロック
  SELECT COUNT(*)
  INTO draft_item_count
  FROM public.items
  WHERE user_id = user_id_input
    AND status = 'draft'
  FOR UPDATE;

  -- カートが空の場合は空注文を作らずにロールバック
  IF draft_item_count = 0 THEN
    RAISE EXCEPTION 'No draft items found for user %', user_id_input;
  END IF;

  -- 2. 新規注文レコードの作成
  INSERT INTO public.orders (user_id, status)
  VALUES (user_id_input, 'pending')
  RETURNING id INTO new_order_id;

  -- 3. 中間テーブル (order_items) への紐付け登録
  INSERT INTO public.order_items (order_id, item_id)
  SELECT new_order_id, id
  FROM public.items
  WHERE user_id = user_id_input
    AND status = 'draft';

  -- 4. アイテムのステータスを draft から pending へ更新
  UPDATE public.items
  SET status = 'pending',
      updated_at = now()
  WHERE user_id = user_id_input
    AND status = 'draft';

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;