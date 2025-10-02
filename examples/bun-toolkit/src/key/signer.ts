import type { PrivateKey } from "../types";
import { fullySpecifiedAlgorithms } from "./management";

export interface Signer {
  sign: (data: Uint8Array) => Promise<Uint8Array>;
}

export async function signer(privateKey: PrivateKey): Promise<Signer> {
  const cryptoKey = await crypto.subtle.importKey("jwk", privateKey, {
    name: fullySpecifiedAlgorithms[privateKey.alg].name,
    namedCurve: fullySpecifiedAlgorithms[privateKey.alg].namedCurve
  }, true, privateKey.key_ops);
  
  return {
    sign: async (data: Uint8Array) => {
      const signature = await crypto.subtle.sign(
        {
          name: fullySpecifiedAlgorithms[privateKey.alg].name,
          hash: fullySpecifiedAlgorithms[privateKey.alg].hash
        }, 
        cryptoKey, 
        data
      );
      return new Uint8Array(signature);
    }
  };
}