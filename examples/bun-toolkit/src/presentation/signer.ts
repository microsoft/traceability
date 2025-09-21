import * as key from "../key";
import type { VerifiablePresentation } from "./presentation";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface SigningOptions {
  kid: string; // Mandatory key ID for header
  iat?: number; // JWT issued at time (seconds since epoch)
  exp?: number; // JWT expiration time (seconds since epoch)
  nonce?: string; // Nonce for replay attack prevention
  aud?: string | string[]; // Audience restriction
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

      // Add iat (issued at) claim - use current time by default
      const issueTime = new Date();
      const iat = Math.floor(issueTime.getTime() / 1000);
      jwtPayload.iat = iat;

      // Add exp (expiration) claim - default to 1 hour from issuance time
      // Presentations are typically short-lived for security, but allow reasonable verification window
      jwtPayload.exp = iat + 3600; // 3600 seconds = 1 hour

      // Apply options overrides - these always take precedence
      if (options.iat !== undefined) {
        jwtPayload.iat = options.iat;
      }
      if (options.exp !== undefined) {
        jwtPayload.exp = options.exp;
      }
      if (options.nonce !== undefined) {
        jwtPayload.nonce = options.nonce;
      }
      if (options.aud !== undefined) {
        jwtPayload.aud = options.aud;
      }

      const payload = base64url.encode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
      const tobeSigned = protectedHeader + "." + payload;
      const signature = await signer.sign(new TextEncoder().encode(tobeSigned));
      const jws = protectedHeader + "." + payload + "." + base64url.encode(signature);
      return jws;
    }
  }
}
