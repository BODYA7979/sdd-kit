/** Mirrors App\Enums\UserRole. Literals must match the backend values exactly. */
export type UserRole = 'candidate' | 'employer' | 'admin';

/** Mirrors UserDTO::toApiArray(). */
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

/** Mirrors AuthResultDTO::toApiArray(). The token stays on the Next.js server (INV-05). */
export interface AuthResult {
  user: User;
  token: string;
}
