// Verifiable Credential interfaces based on W3C VC Data Model v2
export interface VerifiableCredential {
  "@context": string | string[];
  id?: string;
  type: string| string[];
  issuer: string;
  validFrom?: string;
  validUntil?: string;
  credentialSubject: CredentialSubject;
}

export interface CredentialSubject {
  id?: string;
  type?: string | string[];
  [key: string]: any;
}

export interface EnvelopedVerifiableCredential {
  "@context": "https://www.w3.org/ns/credentials/v2";
  id: string;
  type: "EnvelopedVerifiableCredential";
}