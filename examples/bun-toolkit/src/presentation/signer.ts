import * as key from "../key";
import type { VerifiablePresentation } from "./presentation";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface SigningOptions {
  nonce?: string;
  audience?: string | string[];
  issuanceTime?: Date;
  expirationTime?: Date;
  kid: string; // Mandatory key ID for header
}

export interface PresentationSigner {
  sign: (presentation: VerifiablePresentation, options: SigningOptions) => Promise<string>;
}

export const signer = async (privateKey: PrivateKey) => {
  const signer = await key.signer(privateKey);
  return {
    sign: async (presentation: VerifiablePresentation, options: SigningOptions) => {
      // Create header with mandatory kid
      const header = { typ: "vp+jwt", alg: privateKey.alg, kid: options.kid };
      const protectedHeader = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
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

      // Add iat (issued at) claim - use provided time or current time
      const issueTime = options?.issuanceTime || new Date();
      const iat = Math.floor(issueTime.getTime() / 1000);
      jwtPayload.iat = iat;


      // Add exp (expiration) claim - use provided time or default to 1 hour from issuance time
      // Presentations are typically short-lived for security, but allow reasonable verification window
      if (options?.expirationTime) {
        jwtPayload.exp = Math.floor(options.expirationTime.getTime() / 1000);
      } else {
        jwtPayload.exp = iat + 3600; // 3600 seconds = 1 hour
      }

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
