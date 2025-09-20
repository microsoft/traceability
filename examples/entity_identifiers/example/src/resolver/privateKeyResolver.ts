import { key } from "..";
import type { PrivateKey } from "../types";

export const createPrivateKeyResolver = async (entries: Array<[string, PrivateKey]>) => {
  const lookupTable: Record<string, PrivateKey> = {};
  for (const [id, privateKey] of entries) {
    lookupTable[id] = privateKey;
  }
  return {
    resolve: async (id: string) => {
      const privateKey = lookupTable[id];
      if (!privateKey) {
        throw new Error(`Private key not found for id: ${id}`);
      }
      return key.signer(privateKey);
    }
  };
};  