const fs = require("fs");
let s = fs.readFileSync("src/services/events.ts", "utf8");

// 1. Add uploadEventImage function
const uploadFn = `
// ==================== IMAGE UPLOAD ====================

export async function uploadEventImage(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = userId + "/" + Date.now() + "." + ext;
  const { error } = await supabase.storage
    .from("event-images")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("event-images").getPublicUrl(fileName);
  return data.publicUrl;
}

`;

s = s.replace(
  "// ==================== TICKET OPTIONS ====================",
  uploadFn + "// ==================== TICKET OPTIONS ===================="
);

// 2. Fix searchArtists to also search profiles
const oldSearchArtists = `export async function searchArtists(query: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .or(\`name.ilike.%${query}%,city.ilike.%${query}%\`)
    .limit(20);
  if (error) throw error;
  return (data as Artist[]) || [];
}`;

const newSearchArtists = `export async function searchArtists(query: string): Promise<Artist[]> {
  // Search in artists table (seed data)
  const { data: seedArtists, error: err1 } = await supabase
    .from('artists')
    .select('*')
    .or(\`name.ilike.%${query}%,city.ilike.%${query}%\`)
    .limit(20);
  if (err1) throw err1;

  // Also search in profiles with role 'artist' (real users)
  const { data: profileArtists, error: err2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'artist')
    .ilike('name', \`%${query}%\`)
    .limit(20);
  if (err2) throw err2;

  // Convert profiles to Artist-like objects
  const fromProfiles = (profileArtists || []).map((p: Profile) => ({
    id: p.id,
    user_id: p.id,
    name: p.name,
    bio: p.bio,
    photo_url: p.avatar_url,
    cover_url: null,
    genres: [],
    city: p.city,
    country: p.country,
    instagram_url: null,
    twitter_url: null,
    youtube_url: null,
    spotify_url: null,
    followers_count: 0,
    events_count: 0,
    is_verified: false,
    created_at: p.created_at,
  })) as Artist[];

  // Merge, deduplicate by user_id
  const seen = new Set<string>();
  const merged = [...(seedArtists || []), ...fromProfiles].filter((a) => {
    const key = a.user_id || a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return merged as Artist[];
}`;

s = s.replace(oldSearchArtists, newSearchArtists);

// 3. Fix searchOrganizations to also search profiles
const oldSearchOrgs = `export async function searchOrganizations(query: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .or(\`name.ilike.%${query}%,city.ilike.%${query}%\`)
    .limit(20);
  if (error) throw error;
  return (data as Organization[]) || [];
}`;

const newSearchOrgs = `export async function searchOrganizations(query: string): Promise<Organization[]> {
  // Search in organizations table (seed data)
  const { data: seedOrgs, error: err1 } = await supabase
    .from('organizations')
    .select('*')
    .or(\`name.ilike.%${query}%,city.ilike.%${query}%\`)
    .limit(20);
  if (err1) throw err1;

  // Also search in profiles with role 'organizer' (real users)
  const { data: profileOrgs, error: err2 } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'organizer')
    .ilike('name', \`%${query}%\`)
    .limit(20);
  if (err2) throw err2;

  // Convert profiles to Organization-like objects
  const fromProfiles = (profileOrgs || []).map((p: Profile) => ({
    id: p.id,
    owner_id: p.id,
    name: p.name,
    description: p.bio,
    logo_url: p.avatar_url,
    cover_url: null,
    website: null,
    phone: p.phone,
    email: p.email,
    city: p.city,
    country: p.country,
    verification_status: 'pending' as const,
    followers_count: 0,
    events_count: 0,
    created_at: p.created_at,
  })) as Organization[];

  // Merge, deduplicate by owner_id
  const seen = new Set<string>();
  const merged = [...(seedOrgs || []), ...fromProfiles].filter((o) => {
    const key = o.owner_id || o.id;
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });
  return merged as Organization[];
}`;

s = s.replace(oldSearchOrgs, newSearchOrgs);

fs.writeFileSync("src/services/events.ts", s);
console.log("events.ts fixed successfully");
