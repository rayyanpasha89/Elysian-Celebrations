// Auth types are now provided by @clerk/nextjs
// User metadata (role) is stored in Clerk's publicMetadata.

export type UserRole = "client" | "vendor" | "admin" | "manager";

export interface ClerkPublicMetadata {
  role?: UserRole;
  supabaseUserId?: string;
}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: ClerkPublicMetadata;
    publicMetadata?: ClerkPublicMetadata;
  }
}
