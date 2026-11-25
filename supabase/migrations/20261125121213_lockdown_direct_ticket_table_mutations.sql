-- 20261125121213_lockdown_direct_ticket_table_mutations.sql
-- Les écritures de billets passent exclusivement par les RPC transactionnelles.
-- La suppression des politiques directes évite la création, falsification ou
-- suppression d'un billet en contournant le stock et le paiement.
DROP POLICY IF EXISTS tickets_insert_own ON public.tickets;
DROP POLICY IF EXISTS tickets_update_own ON public.tickets;
DROP POLICY IF EXISTS tickets_delete_own ON public.tickets;
DROP POLICY IF EXISTS tickets_select_own ON public.tickets;

REVOKE ALL ON TABLE public.tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tickets TO authenticated;

-- La politique tickets_select_secure créée dans la migration précédente
-- conserve l'accès du détenteur, de l'organisateur, des collaborateurs acceptés
-- et de l'administrateur.
