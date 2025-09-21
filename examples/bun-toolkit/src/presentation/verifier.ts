import * as key from "../key";
import type { VerifiablePresentation } from "./presentation";
import type { PublicKey } from "../types";
import { base64url, jws } from "../encoding";

export interface PresentationVerifier {
  verify: (jws: string, verificationTime?: Date) => Promise<VerifiablePresentation>;
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

      // Verify the key ID matches
      if (header.kid !== publicKey.kid) {
        throw new Error(`Key ID mismatch: expected ${publicKey.kid}, got ${header.kid}`);
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

      // Check exp (expiration) claim - presentations should always have expiration
      if (jwtPayload.exp !== undefined) {
        if (typeof jwtPayload.exp !== 'number') {
          throw new Error('Invalid exp claim: must be a number');
        }
        if (nowInSeconds > jwtPayload.exp) {
          const expDate = new Date(jwtPayload.exp * 1000);
          throw new Error(`Presentation has expired. Expired at: ${expDate.toISOString()}`);
        }
      }

      // Check iat (issued at) claim if present
      if (jwtPayload.iat !== undefined) {
        if (typeof jwtPayload.iat !== 'number') {
          throw new Error('Invalid iat claim: must be a number');
        }
        // Reject if issued in the future (allowing 60 seconds clock skew)
        if (jwtPayload.iat > nowInSeconds + 60) {
          throw new Error('Invalid iat claim: presentation issued in the future');
        }
      }

      // Return the full JWT payload as the presentation
      // This preserves all JWT claims (exp, iat, nonce, aud) alongside the presentation data
      const presentation: VerifiablePresentation = jwtPayload;

      return presentation;
    }
  };
};
