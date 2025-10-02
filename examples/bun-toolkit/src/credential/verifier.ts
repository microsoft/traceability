import * as key from "../key";
import type { VerifiableCredential } from "./credential";
import type { PublicKey } from "../types";
import { base64url, jws } from "../encoding";

export interface CredentialVerifier {
  verify: (jws: string, verificationTime?: Date) => Promise<VerifiableCredential>;
}

export const verifier = async (publicKey: PublicKey) => {
  const verifier = await key.verifier(publicKey);
  return {
    verify: async (jwsString: string, verificationTime?: Date) => {
      // Parse JWS using the generic decoder
      const parsed = jws.parseJWS(jwsString);
      const { header, payload: jwtPayload, protectedHeader, payloadString, signature } = parsed;

      // Verify the algorithm matches the public key
      if (header.alg !== publicKey.alg) {
        throw new Error(`Algorithm mismatch: expected ${publicKey.alg}, got ${header.alg}`);
      }


      // Prepare data for verification
      const toBeVerified = protectedHeader + "." + payloadString;
      const signatureBytes = base64url.decode(signature);

      // Verify the signature
      const isValid = await verifier.verify(
        new TextEncoder().encode(toBeVerified),
        signatureBytes
      );

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      // Validate time-based JWT claims
      const now = verificationTime || new Date();
      const nowInSeconds = Math.floor(now.getTime() / 1000);

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
