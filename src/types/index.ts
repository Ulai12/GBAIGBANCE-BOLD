export type UserRole = 'participant' | 'organizer' | 'artist' | 'admin';

export type EventCategory =
  | 'concert'
  | 'festival'
  | 'conference'
  | 'formation'
  | 'exposition'
  | 'spectacle'
  | 'cultural'
  | 'private';

export type EventStatus = 'draft' | 'pending' | 'published' | 'paused' | 'suspended' | 'cancelled' | 'postponed' | 'completed';
export type EventSalesState = 'open' | 'not_started' | 'closed' | 'sold_out' | 'unavailable';

export type TicketType = 'free' | 'standard' | 'vip' | 'vvip';

export type TicketStatus = 'active' | 'used' | 'cancelled' | 'refunded';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type Language = 'fr' | 'en';

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  city: string;
  country: string;
  bio: string | null;
  preferred_genres?: string[]; // Propriété ajoutée pour le filtrage des préférences
  gemini_config?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}


export type PublicProfile = Pick<Profile, 'id' | 'name' | 'avatar_url' | 'role'>;

export interface Organization {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  city: string;
  country: string;
  verification_status: VerificationStatus;
  followers_count: number;
  events_count: number;
  created_at: string;
}

export interface Artist {
  id: string;
  user_id: string | null;
  name: string;
  bio: string | null;
  photo_url: string | null;
  cover_url: string | null;
  genres: string[];
  city: string;
  country: string;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  followers_count: number;
  events_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  cover_url: string | null;
  images: string[];
  location_name: string;
  location_address: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  ends_at: string | null;
  price_min: number;
  price_max: number | null;
  currency: string;
  capacity: number | null;
  attendees_count: number;
  organizer_id: string | null;
  organizer_user_id: string | null;
  status: EventStatus;
  sales_start_at?: string | null;
  sales_end_at?: string | null;
  cancellation_reason?: string | null;
  suspension_reason?: string | null;
  is_featured: boolean;
  likes_count: number;
  views_count: number;
  created_by_role?: 'organizer' | 'artist';
  created_at: string;
  updated_at: string;
  event_artists?: Artist[] | { artist: Artist }[];
  organizer?: Organization | null;
}

export type CollaboratorRole = 'co_organizer' | 'performer';
export type CollaboratorStatus = 'pending' | 'accepted' | 'declined';

export interface TicketOption {
  id: string;
  event_id: string;
  ticket_type: TicketType;
  label: string;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  description: string | null;
  created_at: string;
}

export interface EventCollaborator {
  id: string;
  event_id: string;
  user_id: string;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invited_by: string;
  created_at: string;
  profile?: PublicProfile;
  artist?: Artist | null;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  ticket_type: TicketType;
  ticket_option_id: string | null;
  price_paid: number;
  currency: string;
  qr_code: string | null;
  status: TicketStatus;
  quantity: number;
  seat_info: string | null;
  created_at: string;
  event?: Event;
}

export type EventWithRelations = Omit<Event, 'event_artists'> & {
  event_artists?: { artist: Artist }[];
  organizer?: Organization | null;
};

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  is_organizer_reply: boolean;
  created_at: string;
  profile?: PublicProfile;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface EventReaction {
  id: string;
  event_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface EventQuestion {
  id: string;
  event_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  profile?: PublicProfile;
  answerer?: PublicProfile;
}

export interface EventScheduleSlot {
  id: string;
  event_id: string;
  artist_id: string | null;
  day_label: string;
  stage_name: string;
  start_time: string;
  end_time: string | null;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface EventLiveLink {
  id: string;
  event_id: string;
  platform: string;
  url: string;
  title: string | null;
  is_live: boolean;
  created_at: string;
}

export type SponsorTier = 'gold' | 'silver' | 'bronze' | 'partner';

export interface EventSponsor {
  id: string;
  event_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: SponsorTier;
  logo_source: 'auto' | 'manual';
  created_at: string;
}
