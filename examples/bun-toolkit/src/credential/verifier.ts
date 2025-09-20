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

      // Decode the JWT payload
      const payloadBytes = base64url.decode(payload);
      const jwtPayload = JSON.parse(new TextDecoder().decode(payloadBytes)) as any;

      // Validate time-based JWT claims
      const nowInSeconds = Math.floor(Date.now() / 1000);

      // Check nbf (not before) claim if present
      if (jwtPayload.nbf !== undefined) {
        if (typeof jwtPayload.nbf !== 'number') {
          throw new Error('Invalid nbf claim: must be a number');
        }
        if (nowInSeconds < jwtPayload.nbf) {
          const nbfDate = new Date(jwtPayload.nbf * 1000);
          throw new Error(`Credential is not yet valid. Not before: ${nbfDate.toISOString()}`);
        }
      }

      // Check exp (expiration) claim if present
      if (jwtPayload.exp !== undefined) {
        if (typeof jwtPayload.exp !== 'number') {
          throw new Error('Invalid exp claim: must be a number');
        }
        if (nowInSeconds > jwtPayload.exp) {
          const expDate = new Date(jwtPayload.exp * 1000);
          throw new Error(`Credential has expired. Expired at: ${expDate.toISOString()}`);
        }
      }

      // Check iat (issued at) claim if present
      if (jwtPayload.iat !== undefined) {
        if (typeof jwtPayload.iat !== 'number') {
          throw new Error('Invalid iat claim: must be a number');
        }
        // Could add additional validation here, e.g., reject if issued in the future
        if (jwtPayload.iat > nowInSeconds + 60) { // Allow 60 seconds clock skew
          throw new Error('Invalid iat claim: credential issued in the future');
        }
      }

      // Return the full JWT payload as the credential
      // This preserves all JWT claims (nbf, exp, iat) alongside the credential data
      const credential: VerifiableCredential = jwtPayload;

      return credential;
    }
  };
};
