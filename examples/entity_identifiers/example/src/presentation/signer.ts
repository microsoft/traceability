import * as key from "../key";
import type { VerifiablePresentation } from "./presentation";
import type { PrivateKey } from "../types";
import { base64url } from "../encoding";

export interface PresentationSigner {
  sign: (presentation: VerifiablePresentation) => Promise<VerifiablePresentation>;
}

export const signer = async (privateKey: PrivateKey) => {
  const signer = await key.signer(privateKey);
  const header = { typ: "vp+jwt", alg: privateKey.alg, kid: privateKey.kid };
  const protectedHeader = base64url.encode(new TextEncoder().encode(JSON.stringify(header)));
  return {
    sign: async (presentation: VerifiablePresentation) => {
      const payload = base64url.encode(new TextEncoder().encode(JSON.stringify(presentation)));
      const tobeSigned = protectedHeader + "." + payload;
      const signature = await signer.sign(new TextEncoder().encode(tobeSigned));
      const jws = protectedHeader + "." + payload + "." + base64url.encode(signature);
      return jws;
    }
  }
}
