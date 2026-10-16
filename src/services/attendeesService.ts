import { supabase } from '@/services/supabase';
import { isRealProfile } from '@/features/events/status';

export interface AttendeeProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  city?: string;
  country?: string;
  bio?: string | null;
  isFriend: boolean;
  hasTicket: boolean;
  isSelf: boolean;
  ticketType?: string;
  joinedAt?: string;
}

export interface EventAttendeesResult {
  attendees: AttendeeProfile[];
  totalCount: number;
  friendsCount: number;
}

/**
 * Récupère les vrais participants d'un événement à partir de Supabase (tickets + profiles)
 * et place obligatoirement les amis (comptes suivis par l'utilisateur connecté) en tête de liste.
 * Limite à 300 participants max.
 */
export async function fetchEventAttendees(
  eventId: string,
  currentUserId?: string | null
): Promise<EventAttendeesResult> {
  try {
    // 1. Récupérer les billets ou participants via RPC SECURITY DEFINER (contourne le RLS tickets_select_own)
    let rpcAttendees: Array<{ user_id: string; name: string; avatar_url: string; ticket_count: number }> = [];
    try {
      const { data: rpcData } = await supabase.rpc('get_event_attendees', { p_event_id: eventId });
      if (rpcData && Array.isArray(rpcData)) {
        rpcAttendees = rpcData;
      }
    } catch {
      // Ignorer si la fonction RPC n'est pas accessible
    }

    // Billets directs accessibles selon la session
    const { data: tickets } = await supabase
      .from('tickets')
      .select('user_id, ticket_type, created_at, status')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .limit(300);

    // Récupération de l'event pour son compteur officiel d'inscrits
    const { data: eventRow } = await supabase
      .from('events')
      .select('attendees_count')
      .eq('id', eventId)
      .maybeSingle();

    const ticketUserIds = [
      ...rpcAttendees.map((r) => r.user_id),
      ...(tickets || []).map((t: { user_id?: string }) => t.user_id),
    ].filter((id): id is string => Boolean(id));

    const uniqueUserIds = [...new Set(ticketUserIds)];

    // 2. Si un utilisateur est connecté, récupérer la liste des personnes qu'il suit (user_follows)
    const followingSet = new Set<string>();
    if (currentUserId) {
      const { data: followsData } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      (followsData || []).forEach((f: { following_id: string }) => {
        if (f.following_id) followingSet.add(f.following_id);
      });
    }

    // 3. Charger les profils réels des détenteurs de billets
    type AttendeeProfileRow = {
      id: string;
      name: string;
      avatar_url: string | null;
      role: string;
      city: string;
      country: string;
      bio: string | null;
      created_at: string;
    };
    const profileMap = new Map<string, AttendeeProfileRow>();
    if (uniqueUserIds.length > 0) {
      const { data: ticketProfiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role, city, country, bio, created_at')
        .in('id', uniqueUserIds);

      ((ticketProfiles || []) as unknown as AttendeeProfileRow[]).forEach((p) => {
        if (p?.id) profileMap.set(p.id, p);
      });
    }

    // Si le profil n'est pas encore dans profileMap mais fourni par RPC
    rpcAttendees.forEach((r) => {
      if (r.user_id && !profileMap.has(r.user_id)) {
        profileMap.set(r.user_id, {
          id: r.user_id,
          name: r.name || 'Membre Gbaigbance',
          avatar_url: r.avatar_url || null,
          role: 'user',
          city: 'Lomé',
          country: 'TG',
          bio: null,
          created_at: new Date().toISOString(),
        });
      }
    });

    // 4. Mapper vers la structure AttendeeProfile (exclusivement les vrais détenteurs de billets de cet événement)
    const attendees: AttendeeProfile[] = Array.from(profileMap.values())
      .filter(isRealProfile)
      .map((p) => {
      const isFriend = followingSet.has(p.id);
      const isSelf = Boolean(currentUserId && p.id === currentUserId);
      const ticket = (tickets || []).find((t: { user_id?: string; ticket_type?: string; created_at?: string }) => t.user_id === p.id);
      const rpcInfo = rpcAttendees.find((r) => r.user_id === p.id);

      return {
        id: p.id,
        name: p.name || 'Membre Gbaigbance',
        avatar_url: p.avatar_url,
        role: p.role || 'user',
        city: p.city || 'Lomé',
        country: p.country || 'TG',
        bio: p.bio,
        isFriend,
        hasTicket: Boolean(ticket || rpcInfo),
        isSelf,
        ticketType: ticket?.ticket_type,
        joinedAt: ticket?.created_at || p.created_at,
      };
    });

    // 5. RÈGLE IMPÉRATIVE DE TRI :
    // - L'utilisateur connecté en premier (s'il participe)
    // - Les amis / personnes suivies (isFriend === true) EN PRIORITÉ ABSOLUE
    // - Les détenteurs de billets confirmés
    // - Par ordre alphabétique
    attendees.sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;

      if (a.isFriend && !b.isFriend) return -1;
      if (!a.isFriend && b.isFriend) return 1;

      if (a.hasTicket && !b.hasTicket) return -1;
      if (!a.hasTicket && b.hasTicket) return 1;

      return a.name.localeCompare(b.name);
    });

    // Borne finale stricte à 300 participants
    const finalAttendees = attendees.slice(0, 300);
    const friendsCount = finalAttendees.filter((a) => a.isFriend).length;
    const officialCount = eventRow?.attendees_count ?? 0;

    return {
      attendees: finalAttendees,
      totalCount: Math.max(finalAttendees.length, officialCount),
      friendsCount,
    };
  } catch (err) {
    console.error('Erreur lors du chargement des participants:', err);
    return {
      attendees: [],
      totalCount: 0,
      friendsCount: 0,
    };
  }
}
