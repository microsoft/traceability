import type { PublicKey } from "../types";
import { fullySpecifiedAlgorithms } from "./management";

export interface Verifier {
  verify: (data: Uint8Array, signature: Uint8Array) => Promise<boolean>;
}

export async function verifier(publicKey: PublicKey): Promise<Verifier> {
  const cryptoKey = await crypto.subtle.importKey("jwk", publicKey, {
    name: fullySpecifiedAlgorithms[publicKey.alg].name,
    namedCurve: fullySpecifiedAlgorithms[publicKey.alg].namedCurve
  }, true, publicKey.key_ops);

  return {
    verify: async (data: Uint8Array, signature: Uint8Array) => {
      return await crypto.subtle.verify(
        {
          name: fullySpecifiedAlgorithms[publicKey.alg].name,
          hash: fullySpecifiedAlgorithms[publicKey.alg].hash
        },
        cryptoKey,
        signature,
        data
      );
    }
  };
}