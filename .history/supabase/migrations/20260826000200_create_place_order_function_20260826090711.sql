-- Create a transaction function to place an order
CREATE OR REPLACE FUNCTION public.place_order(user_id_input UUID)
RETURNS UUID AS $$
DECLARE
  new_order_id UUID;
BEGIN
  -- 1. Insert order
  INSERT INTO public.orders (user_id, status)
  VALUES (user_id_input, 'pending')
  RETURNING id INTO new_order_id;

  -- 2. Update items and create order_items
  INSERT INTO public.order_items (order_id, item_id)
  SELECT new_order_id, id
  FROM public.items
  WHERE user_id = user_id_input
    AND status = 'draft';

  UPDATE public.items
  SET status = 'pending',
      updated_at = now()
  WHERE user_id = user_id_input
    AND status = 'draft';

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
