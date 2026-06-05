// Shape of the authenticated customer as stored in the session / returned by /auth/me.
// Mirrors the relevant columns of the `users` table (see migrations/001_line_auth.sql).
export interface AuthUser {
  id: string;            // users.id (uuid) — primary key used as booking.user_id
  lineUserId: string;    // LINE userId (users.line_user_id)
  displayName: string;
  pictureUrl?: string | null;
  email?: string | null;
}
