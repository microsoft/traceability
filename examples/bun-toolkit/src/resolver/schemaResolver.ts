import type { Schema } from "ajv";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export const createSchemaResolver = async (entries: Array<[string, Schema]>) => {
  const lookupTable: Record<string, Schema> = {};
  for (const [id, schema] of entries) {
    lookupTable[id] = schema;
  }
  return {
    resolve: async (id: string) => {
      const schema = lookupTable[id];
      if (!schema) {
        throw new Error(`Schema not found for id: ${id}`);
      }
      const ajv = new Ajv();
      addFormats(ajv);
      return ajv.compile(schema);
    } 
  };
  
}