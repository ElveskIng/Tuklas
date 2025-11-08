// src/lib/admin.ts
export const ADMIN_EMAIL = 'adming5@gmail.com'; // <-- your admin email (lowercase)

export function isAdminEmail(email?: string | null) {
  return (email || '').toLowerCase() === ADMIN_EMAIL;
}
