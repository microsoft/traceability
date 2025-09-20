import type { PrivateKeyJwk } from "../types";
import { fullySpecifiedAlgorithms } from "./management";

export interface Signer {
  sign: (data: Uint8Array) => Promise<Uint8Array>;
}

export async function signer(privateKeyJwk: PrivateKeyJwk): Promise<Signer> {
  const privateKey = await crypto.subtle.importKey("jwk", privateKeyJwk, {
    name: fullySpecifiedAlgorithms[privateKeyJwk.alg].name,
    namedCurve: fullySpecifiedAlgorithms[privateKeyJwk.alg].namedCurve
  }, true, privateKeyJwk.key_ops);
  
  return {
    sign: async (data: Uint8Array) => {
      return new Uint8Array(await crypto.subtle.sign(
        {
          name: fullySpecifiedAlgorithms[privateKeyJwk.alg].name,
          hash: fullySpecifiedAlgorithms[privateKeyJwk.alg].hash
        }, 
        privateKey, 
        data
      ));
    }
  };
}