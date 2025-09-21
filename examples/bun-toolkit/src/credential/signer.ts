import * as key from "../key";
import type { VerifiableCredential } from "./credential";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface SigningOptions {
  kid: string; // Mandatory key ID for header
  issuanceTime?: Date; // Optional issuance time
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

      // Add iat (issued at) claim - use provided time or current time
      const issueTime = options.issuanceTime || new Date();
      const iat = Math.floor(issueTime.getTime() / 1000);
      jwtPayload.iat = iat;

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