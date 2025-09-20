import type { EnvelopedVerifiableCredential } from '../credential/credential';

// Verifiable Presentation interfaces based on W3C VC Data Model v2
export interface VerifiablePresentation {
  "@context": string | string[];
  id?: string;
  type: string | string[];
  verifiableCredential?: EnvelopedVerifiableCredential[];
  holder?: string;
  // JWT standard claims that may be present after verification
  iat?: number;  // Issued at (Unix timestamp)
  exp?: number;  // Expiration (Unix timestamp)
  nonce?: string;  // Challenge/nonce for replay protection
  aud?: string | string[];  // Audience(s) the presentation is intended for
}

