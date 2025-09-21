import { credential, presentation } from "..";
import type { PublicKey } from "../types";

export const createPublicKeyResolver = async (entries: Array<[string, PublicKey]>, type: 'assertion' | 'authentication') => {
  const lookupTable: Record<string, PublicKey> = {};

  // Index keys only by verification method ID
  for (const [id, jwk] of entries) {
    // Index by verification method ID only
    lookupTable[id] = jwk;
  }

  return {
    resolve: async (id: string) => {
      const publicKey = lookupTable[id];
      if (!publicKey) {
        throw new Error(`Public key not found for id: ${id}`);
      }
      // Return appropriate verifier based on type
      if (type === 'assertion') {
        return credential.verifier(publicKey);
      } else {
        return presentation.verifier(publicKey);
      }
    }
  };
};