import * as key from "../key";
import type { VerifiableCredential } from "./credential";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface SigningOptions {
  kid: string; // Mandatory key ID for header
  iat?: number; // JWT issued at time (seconds since epoch)
  nbf?: number; // JWT not before time (seconds since epoch)
  exp?: number; // JWT expiration time (seconds since epoch)
  cnf?: { kid: string }; // Confirmation method for holder binding
}

export interface CredentialSigner {
  sign: (credential: VerifiableCredential, options: SigningOptions) => Promise<string>;
}

export const signer = async (privateKey: PrivateKey) => {
  const signer = await key.signer(privateKey);
  return {
    sign: async (credential: VerifiableCredential, options: SigningOptions) => {
      // Create header with mandatory kid
      const header = { typ: "vc+jwt", alg: privateKey.alg, kid: options.kid };
      const protectedHeader = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
      // Create JWT payload with credential data
      const jwtPayload: any = { ...credential };

      // Add standard JWT claims
      // Add iss (issuer) claim - equal to credential issuer
      jwtPayload.iss = credential.issuer;

      // Add sub (subject) claim - equal to credentialSubject.id if present
      if (credential.credentialSubject?.id) {
        jwtPayload.sub = credential.credentialSubject.id;
      }

      // Add iat (issued at) claim - use provided iat or current time
      if (options.iat !== undefined) {
        jwtPayload.iat = options.iat;
      } else {
        const issueTime = new Date();
        jwtPayload.iat = Math.floor(issueTime.getTime() / 1000);
      }

      // Convert validFrom to nbf (not before) if present
      if (credential.validFrom) {
        const nbfDate = new Date(credential.validFrom);
        jwtPayload.nbf = Math.floor(nbfDate.getTime() / 1000);
      }

      // Convert validUntil to exp (expiration) if present
      if (credential.validUntil) {
        const expDate = new Date(credential.validUntil);
        jwtPayload.exp = Math.floor(expDate.getTime() / 1000);
      }

      // Apply options overrides - these always take precedence
      if (options.iat !== undefined) {
        jwtPayload.iat = options.iat;
      }
      if (options.nbf !== undefined) {
        jwtPayload.nbf = options.nbf;
      }
      if (options.exp !== undefined) {
        jwtPayload.exp = options.exp;
      }
      if (options.cnf !== undefined) {
        jwtPayload.cnf = options.cnf;
      }

      const payload = base64url.encode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
      const tobeSigned = protectedHeader + "." + payload;
      const signature = await signer.sign(new TextEncoder().encode(tobeSigned));
      const jws = protectedHeader + "." + payload + "." + base64url.encode(signature);
      return jws;
    }
  }
}