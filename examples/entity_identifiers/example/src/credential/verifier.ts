import * as key from "../key";
import type { VerifiableCredential } from "./credential";
import type { PublicKey } from "../types";
import { base64url } from "../encoding";

export interface CredentialVerifier {
  verify: (jws: string) => Promise<VerifiableCredential>;
}

export const verifier = async (publicKey: PublicKey) => {
  const verifier = await key.verifier(publicKey);
  return {
    verify: async (jws: string) => {
      // Parse JWS: header.payload.signature
      const parts = jws.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWS format');
      }

      const [protectedHeader, payload, signature] = parts;

      if (!protectedHeader || !payload || !signature) {
        throw new Error('Invalid JWS format: missing parts');
      }

      // Decode and parse header
      const headerBytes = base64url.decode(protectedHeader);
      const header = JSON.parse(new TextDecoder().decode(headerBytes));

      // Verify the algorithm matches the public key
      if (header.alg !== publicKey.alg) {
        throw new Error(`Algorithm mismatch: expected ${publicKey.alg}, got ${header.alg}`);
      }

      // Verify the key ID matches
      if (header.kid !== publicKey.kid) {
        throw new Error(`Key ID mismatch: expected ${publicKey.kid}, got ${header.kid}`);
      }

      // Prepare data for verification
      const toBeVerified = protectedHeader + "." + payload;
      const signatureBytes = base64url.decode(signature);

      // Verify the signature
      const isValid = await verifier.verify(
        new TextEncoder().encode(toBeVerified),
        signatureBytes
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Decode and return the credential
      const payloadBytes = base64url.decode(payload);
      const credential = JSON.parse(new TextDecoder().decode(payloadBytes)) as VerifiableCredential;

      // Validate date fields if present
      const now = new Date();
      
      if (credential.validFrom) {
        const validFromDate = new Date(credential.validFrom);
        if (isNaN(validFromDate.getTime())) {
          throw new Error('Invalid validFrom date format');
        }
        if (now < validFromDate) {
          throw new Error(`Credential is not yet valid. Valid from: ${credential.validFrom}`);
        }
      }
      
      if (credential.validUntil) {
        const validUntilDate = new Date(credential.validUntil);
        if (isNaN(validUntilDate.getTime())) {
          throw new Error('Invalid validUntil date format');
        }
        if (now > validUntilDate) {
          throw new Error(`Credential has expired. Valid until: ${credential.validUntil}`);
        }
      }

      return credential;
    }
  };
};
