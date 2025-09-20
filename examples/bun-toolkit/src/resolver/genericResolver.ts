import type { Controller } from "../controller/controller";
import type { PublicKey } from "../types";
import type { Schema } from "ajv";
import { createControllerResolver } from "./controllerResolver";
import { createSchemaResolver } from "./schemaResolver";
import { createPublicKeyResolver } from "./publicKeyResolver";
import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

export interface GenericResolver {
  // Controller resolution for DIDs
  resolveController: (id: string) => Promise<{
    assertion: {
      resolve: (id: string) => Promise<any>;
    };
    authentication: {
      resolve: (id: string) => Promise<any>;
    };
  }>;

  // Schema resolution for credentialSchema validation
  resolveSchema: (id: string) => Promise<ValidateFunction>;

  // Add new controllers
  addController: (id: string, controller: Controller) => void;

  // Add new schemas
  addSchema: (id: string, schema: Schema) => void;
}

export const createGenericResolver = (
  controllers?: Array<[string, Controller]>,
  schemas?: Array<[string, Schema]>
): GenericResolver => {
  // Internal storage
  const controllerLookup: Record<string, Controller> = {};
  const schemaLookup: Record<string, Schema> = {};

  // Initialize with provided data
  if (controllers) {
    for (const [id, controller] of controllers) {
      controllerLookup[id] = controller;
    }
  }

  if (schemas) {
    for (const [id, schema] of schemas) {
      schemaLookup[id] = schema;
    }
  }

  // Create AJV instance for schema compilation
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  // Cache for compiled schemas
  const compiledSchemaCache: Record<string, ValidateFunction> = {};

  return {
    resolveController: async (id: string) => {
      const controller = controllerLookup[id];
      if (!controller) {
        throw new Error(`Controller not found for id: ${id}`);
      }

      const assertionKeys: Array<[string, PublicKey]> = [];
      const authenticationKeys: Array<[string, PublicKey]> = [];

      for (const verificationMethod of controller.verificationMethod) {
        if (controller.assertionMethod?.includes(verificationMethod.id)) {
          assertionKeys.push([verificationMethod.id, verificationMethod.publicKeyJwk]);
        }
        if (controller.authentication?.includes(verificationMethod.id)) {
          authenticationKeys.push([verificationMethod.id, verificationMethod.publicKeyJwk]);
        }
      }

      return {
        assertion: await createPublicKeyResolver(assertionKeys, 'assertion'),
        authentication: await createPublicKeyResolver(authenticationKeys, 'authentication')
      };
    },

    resolveSchema: async (id: string) => {
      // Check cache first
      if (compiledSchemaCache[id]) {
        return compiledSchemaCache[id];
      }

      const schema = schemaLookup[id];
      if (!schema) {
        throw new Error(`Schema not found for id: ${id}`);
      }

      // Compile and cache the schema
      const compiled = ajv.compile(schema);
      compiledSchemaCache[id] = compiled;
      return compiled;
    },

    addController: (id: string, controller: Controller) => {
      controllerLookup[id] = controller;
    },

    addSchema: (id: string, schema: Schema) => {
      schemaLookup[id] = schema;
      // Clear cache entry if exists
      delete compiledSchemaCache[id];
    }
  };
};

// Create a default resolver with no initial data
export const defaultGenericResolver = createGenericResolver();