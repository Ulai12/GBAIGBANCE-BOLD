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

export type MainCategoryId =
  | 'cultural_artistic'
  | 'commercial_professional'
  | 'festive_nightlife'
  | 'sports'
  | 'private_family';

export type SubCategoryId =
  | 'concerts_spectacles'
  | 'festivals'
  | 'expositions_vernissages'
  | 'foires_salons'
  | 'conferences_seminaires'
  | 'lancements_galas'
  | 'clubbing_soirees'
  | 'fetes_carnavals'
  | 'competitions_matchs'
  | 'fan_zones'
  | 'celebrations_personnelles';

export type EventStatus = 'draft' | 'pending' | 'published' | 'paused' | 'suspended' | 'cancelled' | 'postponed' | 'completed';
export type EventSalesState = 'open' | 'not_started' | 'closed' | 'sold_out' | 'unavailable';

export type TicketType = 'free' | 'standard' | 'vip' | 'vvip';

// Statuts normalisés stricts du ticket
export type TicketStatus = 'pending' | 'valid' | 'used' | 'frozen' | 'refunded' | 'expired';

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

export type EventAccessType = 'tickets' | 'whatsapp' | 'external' | 'free';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  main_category?: MainCategoryId | string | null;
  subcategory?: SubCategoryId | string | null;
  cover_url: string | null;
  images: string[];
  video_url?: string | null;
  access_type?: EventAccessType;
  whatsapp_number?: string | null;
  whatsapp_message?: string | null;
  external_ticket_url?: string | null;
  unlimited_capacity?: boolean;
  allow_comments?: boolean;
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
  postponed_to?: string | null;
  postponement_deadline?: string | null;
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

export type PaymentProvider = 'tmoney' | 'flooz' | 'mtn';

export type RefundStatus = 'requested' | 'under_review' | 'approved' | 'rejected' | 'processing' | 'refunded' | 'failed';
export type RefundReasonType = 'cancellation' | 'postponement' | 'customer_request';

export interface PaymentRecord {
  id: string;
  event_id: string;
  buyer_user_id: string;
  ticket_option_id: string;
  quantity: number;
  amount_xof: number;
  currency: string;
  payment_provider: PaymentProvider;
  payment_phone: string;
  operator_reference?: string | null;
  status: 'pending' | 'successful' | 'failed' | 'expired' | 'refunded' | 'partially_refunded';
  expires_at: string;
  created_at: string;
}

export interface TicketRefund {
  id: string;
  ticket_id: string;
  payment_id: string;
  event_id: string;
  requester_user_id: string;
  status: RefundStatus;
  reason_type: RefundReasonType;
  reason_details?: string | null;
  rejection_reason?: string | null;
  amount_xof: number;
  currency: string;
  payment_provider: PaymentProvider;
  refund_phone: string;
  operator_reference?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface EventPresenceBadge {
  id: string;
  event_id: string;
  user_id: string;
  ticket_id: string;
  challenge_type: string;
  is_public_on_profile: boolean;
  server_timestamp: string;
  badge_name: string;
  badge_icon: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  buyer_user_id?: string | null;
  payment_id?: string | null;
  ticket_type: TicketType;
  ticket_option_id: string | null;
  price_paid: number;
  currency: string;
  qr_code: string | null;
  status: TicketStatus;
  quantity: number;
  seat_info: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_email?: string | null;
  is_claimed?: boolean;
  claimed_at?: string | null;
  claim_token_expires_at?: string | null;
  postponed_decision?: 'pending' | 'keep' | 'refund_requested';
  challenge_attempts?: number;
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
