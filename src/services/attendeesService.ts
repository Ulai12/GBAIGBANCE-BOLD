import { supabase } from '@/services/supabase';
import type { Profile } from '@/types';

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
    // 1. Récupérer les billets confirmés pour cet événement
    const { data: tickets } = await supabase
      .from('tickets')
      .select('user_id, ticket_type, created_at, status')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .limit(300);

    const ticketUserIds = (tickets || [])
      .map((t: { user_id?: string }) => t.user_id)
      .filter((id): id is string => Boolean(id));

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
    const profileMap = new Map<string, Profile>();
    if (ticketUserIds.length > 0) {
      const { data: ticketProfiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, role, city, country, bio, created_at')
        .in('id', ticketUserIds);

      (ticketProfiles || []).forEach((p: Profile) => {
        if (p?.id) profileMap.set(p.id, p);
      });
    }

    // 4. Mapper vers la structure AttendeeProfile (exclusivement les vrais détenteurs de billets de cet événement)
    const attendees: AttendeeProfile[] = Array.from(profileMap.values()).map((p) => {
      const isFriend = followingSet.has(p.id);
      const isSelf = Boolean(currentUserId && p.id === currentUserId);
      const ticket = (tickets || []).find((t: { user_id?: string; ticket_type?: string; created_at?: string }) => t.user_id === p.id);

      return {
        id: p.id,
        name: p.name || 'Membre Gbaïgbancê',
        avatar_url: p.avatar_url,
        role: p.role || 'user',
        city: p.city || 'Lomé',
        country: p.country || 'TG',
        bio: p.bio,
        isFriend,
        hasTicket: Boolean(ticket),
        isSelf,
        ticketType: ticket?.ticket_type,
        joinedAt: ticket?.created_at || p.created_at,
      };
    });

    // 6. RÈGLE IMPÉRATIVE DE TRI :
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

    return {
      attendees: finalAttendees,
      totalCount: finalAttendees.length,
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
