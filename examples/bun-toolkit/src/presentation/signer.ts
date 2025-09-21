import * as key from "../key";
import type { VerifiablePresentation } from "./presentation";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface SigningOptions {
  nonce?: string;
  audience?: string | string[];
}

export interface PresentationSigner {
  sign: (presentation: VerifiablePresentation, options?: SigningOptions) => Promise<string>;
}

export const signer = async (privateKey: PrivateKey) => {
  const signer = await key.signer(privateKey);
  const header = { typ: "vp+jwt", alg: privateKey.alg, kid: privateKey.kid };
  const protectedHeader = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
  return {
    sign: async (presentation: VerifiablePresentation, options?: SigningOptions) => {
      // Create JWT payload with presentation and optional claims
      const jwtPayload: any = { ...presentation };

      // Add standard JWT claims
      // Add iss (issuer) claim - equal to presentation holder
      if (presentation.holder) {
        jwtPayload.iss = presentation.holder;
      }

      // Add sub (subject) claim - equal to presentation holder as well for presentations
      if (presentation.holder) {
        jwtPayload.sub = presentation.holder;
      }

      // Add iat (issued at) claim - current time in seconds
      const now = Math.floor(Date.now() / 1000);
      jwtPayload.iat = now;

      // Add exp (expiration) claim - default to 2 minutes from now
      // Presentations are typically short-lived for security
      jwtPayload.exp = now + 120; // 120 seconds = 2 minutes

      // Add nonce if provided (for replay attack prevention)
      if (options?.nonce) {
        jwtPayload.nonce = options.nonce;
      }

      // Add audience if provided (for audience restriction)
      if (options?.audience) {
        jwtPayload.aud = options.audience;
      }

      const payload = base64url.encode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
      const tobeSigned = protectedHeader + "." + payload;
      const signature = await signer.sign(new TextEncoder().encode(tobeSigned));
      const jws = protectedHeader + "." + payload + "." + base64url.encode(signature);
      return jws;
    }
  }
}
