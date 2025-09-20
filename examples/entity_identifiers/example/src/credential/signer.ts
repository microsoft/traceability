import * as key from "../key";
import type { VerifiableCredential } from "./credential";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface CredentialSigner {
  sign: (credential: VerifiableCredential) => Promise<VerifiableCredential>;
}

export const signer = async (privateKey: PrivateKey) => {
  const signer = await key.signer(privateKey);
  const header = { typ: "vc+jwt", alg: privateKey.alg, kid: privateKey.kid };
  const protectedHeader = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
  return {
    sign: async (credential: VerifiableCredential) => {
      const payload = base64url.encode(new TextEncoder().encode(JSON.stringify(credential)));
      const tobeSigned = protectedHeader + "." + payload;
      const signature = await signer.sign(new TextEncoder().encode(tobeSigned));
      const jws = protectedHeader + "." + payload + "." + base64url.encode(signature);
      return jws;
    }
  }
}