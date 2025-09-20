import type { EnvelopedVerifiableCredential } from '../credential/credential';

// Verifiable Presentation interfaces based on W3C VC Data Model v2
export interface VerifiablePresentation {
  "@context": string | string[];
  id?: string;
  type: string | string[];
  verifiableCredential?: EnvelopedVerifiableCredential[];
  holder?: string
}

