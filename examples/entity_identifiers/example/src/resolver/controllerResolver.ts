import type { Controller } from "../controller/controller";
import { createPublicKeyResolver } from "./publicKeyResolver";

export const createControllerResolver = async (entries: Array<[string, Controller]>) => {
  const lookupTable: Record<string, Controller> = {};
  for (const [id, controller] of entries) {
    lookupTable[id] = controller;
  }
  return {
    resolve: async (id: string) => {
      const doc = lookupTable[id];
      if (!doc) {
        throw new Error(`Controller not found for id: ${id}`);
      }
      const assertionKeys = [];
      const authenticationKeys = [];
      for (const verificationMethod of doc.verificationMethod) {
        if (doc.assertionMethod.includes(verificationMethod.id)) {
          assertionKeys.push([verificationMethod.id, verificationMethod.publicKeyJwk]);
        }
        if (doc.authentication.includes(verificationMethod.id)) {
          authenticationKeys.push([verificationMethod.id, verificationMethod.publicKeyJwk]);
        }
      }
      return {
        assertion: createPublicKeyResolver(assertionKeys, 'assertion'),
        authentication: createPublicKeyResolver(authenticationKeys, 'authentication')
      };

    }
  };
};