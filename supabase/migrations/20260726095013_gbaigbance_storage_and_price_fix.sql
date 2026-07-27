/*
# Gbaigbance — Storage bucket pour images d'événements

## Description
1. Crée un bucket public "event-images" pour l'upload de photos d'événements
2. Ajoute les policies RLS pour que les utilisateurs authentifiés puissent uploader
3. Ajoute un trigger pour mettre à jour price_min et price_max automatiquement

## Sécurité
- Bucket public en lecture (tous peuvent voir les images)
- Upload réservé aux utilisateurs authentifiés
*/

-- 1. Créer le bucket storage pour les images d'événements
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies pour le bucket event-images
DROP POLICY IF EXISTS "event_images_public_read" ON storage.objects;
CREATE POLICY "event_images_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_upload" ON storage.objects;
CREATE POLICY "event_images_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_update" ON storage.objects;
CREATE POLICY "event_images_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images' AND owner_id = auth.uid()::text)
WITH CHECK (bucket_id = 'event-images');

DROP POLICY IF EXISTS "event_images_auth_delete" ON storage.objects;
CREATE POLICY "event_images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images' AND owner_id = auth.uid()::text);

-- 3. Trigger pour mettre à jour price_min et price_max automatiquement
CREATE OR REPLACE FUNCTION update_event_price_range()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
  v_min numeric;
  v_max numeric;
BEGIN
  v_event_id := COALESCE(NEW.event_id, OLD.event_id);
  
  SELECT COALESCE(MIN(price), 0), COALESCE(MAX(price), 0)
  INTO v_min, v_max
  FROM ticket_options
  WHERE event_id = v_event_id;
  
  UPDATE events 
  SET price_min = v_min, price_max = CASE WHEN v_max > 0 THEN v_max ELSE NULL END
  WHERE id = v_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_event_price ON ticket_options;
CREATE TRIGGER trg_update_event_price
AFTER INSERT OR UPDATE OR DELETE ON ticket_options
FOR EACH ROW EXECUTE FUNCTION update_event_price_range();

GRANT EXECUTE ON FUNCTION update_event_price_range TO authenticated;
