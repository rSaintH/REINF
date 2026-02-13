CREATE OR REPLACE FUNCTION public.admin_confirm_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = now(), updated_at = now()
  WHERE id = p_user_id;
END;
$$;
