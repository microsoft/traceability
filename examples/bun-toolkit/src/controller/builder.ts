import type { PublicKey } from "../types";
import { generatePrivateKey, exportPublicKey } from "../key/management";

export interface ControllerBuilder {
  // Core identity
  id(id: string): ControllerBuilder;
  alsoKnownAs(...aliases: string[]): ControllerBuilder;
  context(...contexts: string[]): ControllerBuilder;

  // Keys - only assertion and authentication keys allowed
  addAssertionKey(publicKey: PublicKey, keyId?: string): ControllerBuilder;
  addAuthenticationKey(publicKey: PublicKey, keyId?: string): ControllerBuilder;

  // Enhanced key methods with generation
  generateAndAddAssertionKey(algorithm?: string, keyId?: string): Promise<ControllerBuilder>;
  generateAndAddAuthenticationKey(algorithm?: string, keyId?: string): Promise<ControllerBuilder>;

  // GeoJSON feature support
  addFeature(geometry?: any, properties?: any): ControllerBuilder;

  // Build and serialize with better return types
  build(): ControllerDocument;
  serialize(mediaType: "application/cid"): Uint8Array;

  // Utility methods
  clone(): ControllerBuilder;
  reset(): ControllerBuilder;

  // Access generated keys for signing
  getGeneratedKeys(): { [keyId: string]: KeyPairResult };
}

export interface ControllerDocument {
  "@context": string[];
  type?: "FeatureCollection";
  id: string;
  alsoKnownAs?: string[];
  verificationMethod: any[];
  assertionMethod: string[];
  authentication: string[];
  features?: Array<{
    type: "Feature";
    geometry?: any;
    properties?: any;
  }>;
}

export interface KeyPairResult {
  privateKey: any;
  publicKey: any;
}

class ControllerBuilderImpl implements ControllerBuilder {
  private data: ControllerDocument = {
    "@context": ["https://www.w3.org/ns/cid/v1"],
    id: "",
    verificationMethod: [],
    assertionMethod: [],
    authentication: [],
  };

  private features: Array<{
    type: "Feature";
    geometry?: any;
    properties?: any;
  }> = [];

  private additionalContexts: string[] = [];

  private generatedKeys: { [keyId: string]: KeyPairResult } = {};

  id(id: string): ControllerBuilder {
    if (!id || !id.startsWith('https://')) {
      throw new Error("Controller ID must be a valid HTTPS URL");
    }
    this.data.id = id;
    return this;
  }

  alsoKnownAs(...aliases: string[]): ControllerBuilder {
    this.data.alsoKnownAs = [...(this.data.alsoKnownAs || []), ...aliases];
    return this;
  }

  context(...contexts: string[]): ControllerBuilder {
    // Filter out non-strings and deduplicate
    const validContexts = contexts.filter(ctx => typeof ctx === 'string');
    const existingContexts = new Set([...this.data["@context"], ...this.additionalContexts]);
    const newContexts = validContexts.filter(ctx => !existingContexts.has(ctx));
    this.additionalContexts = [...this.additionalContexts, ...newContexts];
    return this;
  }

  addAssertionKey(publicKey: PublicKey, keyId?: string): ControllerBuilder {
    if (!this.data.id) {
      throw new Error("Controller ID must be set before adding verification methods");
    }

    // Use provided keyId, publicKey.kid, or generate one
    const finalKeyId = keyId || publicKey.kid || `key-${this.data.verificationMethod.length}`;
    const vmId = finalKeyId.includes('#') ? finalKeyId : `${this.data.id}#${finalKeyId}`;

    // Check for duplicate key IDs
    const existingIds = this.data.verificationMethod.map(vm => vm.id);
    if (existingIds.includes(vmId)) {
      throw new Error(`Verification method with ID ${vmId} already exists`);
    }

    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });

    this.data.assertionMethod.push(vmId);
    return this;
  }

  addAuthenticationKey(publicKey: PublicKey, keyId?: string): ControllerBuilder {
    if (!this.data.id) {
      throw new Error("Controller ID must be set before adding verification methods");
    }

    // Use provided keyId, publicKey.kid, or generate one
    const finalKeyId = keyId || publicKey.kid || `key-${this.data.verificationMethod.length}`;
    const vmId = finalKeyId.includes('#') ? finalKeyId : `${this.data.id}#${finalKeyId}`;

    // Check for duplicate key IDs
    const existingIds = this.data.verificationMethod.map(vm => vm.id);
    if (existingIds.includes(vmId)) {
      throw new Error(`Verification method with ID ${vmId} already exists`);
    }

    this.data.verificationMethod.push({
      id: vmId,
      type: "JsonWebKey",
      controller: this.data.id,
      publicKeyJwk: publicKey
    });

    this.data.authentication.push(vmId);
    return this;
  }

  async generateAndAddAssertionKey(algorithm = "ES256", keyId?: string): Promise<ControllerBuilder> {
    const privateKey = await generatePrivateKey(algorithm as any);
    const publicKey = await exportPublicKey(privateKey);

    const finalKeyId = keyId || `generated-assertion-${Object.keys(this.generatedKeys).length}`;

    // Store the key pair for later use
    this.generatedKeys[finalKeyId] = { privateKey, publicKey };

    // Add to controller
    this.addAssertionKey(publicKey, finalKeyId);
    return this;
  }

  async generateAndAddAuthenticationKey(algorithm = "ES256", keyId?: string): Promise<ControllerBuilder> {
    const privateKey = await generatePrivateKey(algorithm as any);
    const publicKey = await exportPublicKey(privateKey);

    const finalKeyId = keyId || `generated-auth-${Object.keys(this.generatedKeys).length}`;

    // Store the key pair for later use
    this.generatedKeys[finalKeyId] = { privateKey, publicKey };

    // Add to controller
    this.addAuthenticationKey(publicKey, finalKeyId);
    return this;
  }

  addFeature(geometry?: any, properties?: any): ControllerBuilder {
    // Basic validation for GeoJSON geometry if provided
    if (geometry && (!geometry.type || !geometry.coordinates)) {
      throw new Error("Geometry must have 'type' and 'coordinates' properties");
    }

    const feature: any = {
      type: "Feature"
    };

    if (geometry) {
      feature.geometry = geometry;
    }

    if (properties) {
      feature.properties = properties;
    }

    this.features.push(feature);
    return this;
  }

  build(): ControllerDocument {
    if (!this.data.id) {
      throw new Error("Controller ID is required");
    }

    // Clean up empty arrays
    const result = { ...this.data };
    if (result.alsoKnownAs && result.alsoKnownAs.length === 0) {
      delete result.alsoKnownAs;
    }

    // Set context based on whether we have features - ensure no duplicates
    let baseContexts: string[];
    if (this.features.length > 0) {
      baseContexts = ["https://www.w3.org/ns/cid/v1", "https://geojson.org/geojson-ld/geojson-context.jsonld"];
      result.type = "FeatureCollection";
      result.features = [...this.features];
    } else {
      baseContexts = ["https://www.w3.org/ns/cid/v1"];
    }

    // Combine and deduplicate all contexts
    const allContexts = [...baseContexts, ...this.additionalContexts];
    const uniqueContexts = Array.from(new Set(allContexts));
    result["@context"] = uniqueContexts;

    return result;
  }

  serialize(mediaType: "application/cid"): Uint8Array {
    const controller = this.build();
    const jsonString = JSON.stringify(controller);
    return new TextEncoder().encode(jsonString);
  }

  clone(): ControllerBuilder {
    const newBuilder = new ControllerBuilderImpl();
    newBuilder.data = JSON.parse(JSON.stringify(this.data));
    newBuilder.features = JSON.parse(JSON.stringify(this.features));
    newBuilder.additionalContexts = [...this.additionalContexts];
    newBuilder.generatedKeys = JSON.parse(JSON.stringify(this.generatedKeys));
    return newBuilder;
  }

  reset(): ControllerBuilder {
    this.data = {
      "@context": ["https://www.w3.org/ns/cid/v1"],
      id: "",
      verificationMethod: [],
      assertionMethod: [],
      authentication: [],
    };
    this.features = [];
    this.additionalContexts = [];
    this.generatedKeys = {};
    return this;
  }

  getGeneratedKeys(): { [keyId: string]: KeyPairResult } {
    return { ...this.generatedKeys };
  }
}

// Factory function
export function createControllerBuilder(): ControllerBuilder {
  return new ControllerBuilderImpl();
}