import * as key from "../key";
import type { VerifiablePresentation } from "./presentation";
import type { PublicKey } from "../types";
import { base64url } from "../encoding";

export interface PresentationVerifier {
  verify: (jws: string) => Promise<VerifiablePresentation>;
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

      // Decode and return the presentation
      const payloadBytes = base64url.decode(payload);
      const presentation = JSON.parse(new TextDecoder().decode(payloadBytes)) as VerifiablePresentation;

      return presentation;
    }
  };
};
