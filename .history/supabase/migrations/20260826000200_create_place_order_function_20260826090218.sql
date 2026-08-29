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

  -- 2. Update items
  UPDATE public.items
  SET status = 'ordered',
      order_id = new_order_id
  WHERE user_id = user_id_input
    AND status = 'draft';

  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
