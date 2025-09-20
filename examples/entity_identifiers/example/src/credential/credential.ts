// Verifiable Credential interfaces based on W3C VC Data Model v2
export interface VerifiableCredential {
  "@context": string | string[];
  id?: string;
  type: string| string[];
  issuer: string;
  validFrom?: string;
  validUntil?: string;
  credentialSubject: CredentialSubject;
  cnf?: {
    kid: string;
  };
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

export const createEnvelopedVerifiableCredential = (jws: string) => {
  return {
    "@context": "https://www.w3.org/ns/credentials/v2",
    id: `data:application/vc+jwt,${jws}`,
    type: "EnvelopedVerifiableCredential"
  } as EnvelopedVerifiableCredential;
}

export const createJsonWebSignatureFromEnvelopedVerifiableCredential = (envelopedVerifiableCredential: EnvelopedVerifiableCredential) => {
  if (envelopedVerifiableCredential.id.split(",")[0] !== "data:application/vc+jwt") {
    throw new Error("Invalid enveloped verifiable credential");
  }
  return envelopedVerifiableCredential.id.split(",")[1];
}