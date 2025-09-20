import type { PublicKeyJwk } from "../types";
import { fullySpecifiedAlgorithms } from "./management";

export interface Verifier {
  verify: (data: Uint8Array, signature: Uint8Array) => Promise<boolean>;
}

export async function verifier(publicKeyJwk: PublicKeyJwk): Promise<Verifier> {
  const publicKey = await crypto.subtle.importKey("jwk", publicKeyJwk, {
    name: fullySpecifiedAlgorithms[publicKeyJwk.alg].name,
    namedCurve: fullySpecifiedAlgorithms[publicKeyJwk.alg].namedCurve
  }, true, publicKeyJwk.key_ops);

  return {
    verify: async (data: Uint8Array, signature: Uint8Array) => {
      return await crypto.subtle.verify(
        {
          name: fullySpecifiedAlgorithms[publicKeyJwk.alg].name,
          hash: fullySpecifiedAlgorithms[publicKeyJwk.alg].hash
        },
        publicKey,
        signature,
        data
      );
    }
  };
}