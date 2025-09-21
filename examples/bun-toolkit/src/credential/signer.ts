import * as key from "../key";
import type { VerifiableCredential } from "./credential";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface CredentialSigner {
  sign: (credential: VerifiableCredential) => Promise<string>;
}

export const signer = async (privateKey: PrivateKey) => {
  const signer = await key.signer(privateKey);
  const header = { typ: "vc+jwt", alg: privateKey.alg, kid: privateKey.kid };
  const protectedHeader = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
  return {
    sign: async (credential: VerifiableCredential) => {
      // Create JWT payload with credential data
      const jwtPayload: any = { ...credential };

      // Add standard JWT claims
      // Add iss (issuer) claim - equal to credential issuer
      jwtPayload.iss = credential.issuer;

      // Add sub (subject) claim - equal to credentialSubject.id if present
      if (credential.credentialSubject?.id) {
        jwtPayload.sub = credential.credentialSubject.id;
      }

      // Add iat (issued at) claim - current time in seconds
      const now = Math.floor(Date.now() / 1000);
      jwtPayload.iat = now;

      // Convert validFrom to nbf (not before) if present
      if (credential.validFrom) {
        const nbfDate = new Date(credential.validFrom);
        jwtPayload.nbf = Math.floor(nbfDate.getTime() / 1000);
        delete jwtPayload.validFrom;
      }

      // Convert validUntil to exp (expiration) if present
      if (credential.validUntil) {
        const expDate = new Date(credential.validUntil);
        jwtPayload.exp = Math.floor(expDate.getTime() / 1000);
        delete jwtPayload.validUntil;
      }

      const payload = base64url.encode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
      const tobeSigned = protectedHeader + "." + payload;
      const signature = await signer.sign(new TextEncoder().encode(tobeSigned));
      const jws = protectedHeader + "." + payload + "." + base64url.encode(signature);
      return jws;
    }
  }
}