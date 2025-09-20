import { credential, presentation } from "..";
import type { PublicKey } from "../types";

export const createPublicKeyResolver = async (entries: Array<[string, PublicKey]>, type: 'assertion' | 'authentication') => {
  const lookupTable: Record<string, PublicKey> = {};

  // Index keys by both full verification method ID and raw kid
  for (const [id, jwk] of entries) {
    // Index by full verification method ID (e.g., "https://example.com#kid123")
    lookupTable[id] = jwk;

    // Also index by just the kid if the ID contains a fragment
    if (id.includes('#')) {
      const kid = id.split('#')[1];
      // Only add if there's no conflict with existing kid
      if (!lookupTable[kid]) {
        lookupTable[kid] = jwk;
      }
    }

    // Also index by the JWK's own kid property if it exists and differs
    if (jwk.kid && !lookupTable[jwk.kid]) {
      lookupTable[jwk.kid] = jwk;
    }
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