import { test, expect } from "bun:test";
import { generatePrivateKey, exportPublicKey } from "../src/key/management";

// Refined credential builder interface with better validation and type safety
interface CredentialBuilder {
  // Core identity
  context(...contexts: string[]): CredentialBuilder;
  id(id: string): CredentialBuilder;
  type(...types: string[]): CredentialBuilder;
  issuer(issuer: string): CredentialBuilder;

  // Validity periods with validation
  validFrom(date: string): CredentialBuilder;
  validUntil(date: string): CredentialBuilder;

  // Subject - support building incrementally with better type safety
  subject(id: string): CredentialBuilder; // Simplified method name
  subjectType(...types: string[]): CredentialBuilder;
  subjectProperty(key: string, value: any): CredentialBuilder;
  subjectProperties(properties: { [key: string]: any }): CredentialBuilder;

  // Schema references with validation
  addSchema(id: string, type?: string): CredentialBuilder;

  // Key confirmation
  confirmationKey(kid: string): CredentialBuilder;

  // Build and serialize with media type enforcement
  build(): CredentialDocument;
  serialize(mediaType?: "application/vc"): Uint8Array;

  // Utility methods
  clone(): CredentialBuilder;
  reset(): CredentialBuilder;
}

interface CredentialDocument {
  "@context": string | string[];
  id?: string;
  type: string | string[];
  issuer: string;
  validFrom?: string;
  validUntil?: string;
  credentialSubject: {
    id?: string;
    type?: string | string[];
    [key: string]: any;
  };
  credentialSchema?: Array<{
    id: string;
    type: string;
  }>;
  cnf?: {
    kid: string;
  };
}

// Enhanced implementation with better validation and error handling
class EnhancedCredentialBuilder implements CredentialBuilder {
  private data: CredentialDocument = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "",
    credentialSubject: {}
  };

  private additionalContexts: string[] = [];

  context(...contexts: string[]): CredentialBuilder {
    // Filter out non-strings and deduplicate
    const validContexts = contexts.filter(ctx => typeof ctx === 'string');
    const existingContexts = new Set([
      ...(Array.isArray(this.data["@context"]) ? this.data["@context"] : [this.data["@context"]]),
      ...this.additionalContexts
    ]);
    const newContexts = validContexts.filter(ctx => !existingContexts.has(ctx));
    this.additionalContexts = [...this.additionalContexts, ...newContexts];
    return this;
  }

  id(id: string): CredentialBuilder {
    if (!id || !id.startsWith('https://')) {
      throw new Error("Credential ID must be a valid HTTPS URL");
    }
    this.data.id = id;
    return this;
  }

  type(...types: string[]): CredentialBuilder {
    const existingTypes = Array.isArray(this.data.type) ? this.data.type : [this.data.type];
    const validTypes = types.filter(type => typeof type === 'string' && type.trim().length > 0);
    const newTypes = validTypes.filter(type => !existingTypes.includes(type));
    this.data.type = [...existingTypes, ...newTypes];
    return this;
  }

  issuer(issuer: string): CredentialBuilder {
    if (!issuer || !issuer.startsWith('https://')) {
      throw new Error("Credential issuer must be a valid HTTPS URL");
    }
    this.data.issuer = issuer;
    return this;
  }

  validFrom(date: string): CredentialBuilder {
    // Basic ISO 8601 validation
    if (!date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)) {
      throw new Error("validFrom must be a valid ISO 8601 date string");
    }
    this.data.validFrom = date;
    return this;
  }

  validUntil(date: string): CredentialBuilder {
    // Basic ISO 8601 validation
    if (!date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/)) {
      throw new Error("validUntil must be a valid ISO 8601 date string");
    }
    this.data.validUntil = date;
    return this;
  }

  subject(id: string): CredentialBuilder {
    if (!id || !id.startsWith('https://')) {
      throw new Error("Subject ID must be a valid HTTPS URL");
    }
    this.data.credentialSubject.id = id;
    return this;
  }

  subjectType(...types: string[]): CredentialBuilder {
    const existingTypes = this.data.credentialSubject.type
      ? (Array.isArray(this.data.credentialSubject.type) ? this.data.credentialSubject.type : [this.data.credentialSubject.type])
      : [];
    const validTypes = types.filter(type => typeof type === 'string' && type.trim().length > 0);
    const newTypes = validTypes.filter(type => !existingTypes.includes(type));
    this.data.credentialSubject.type = [...existingTypes, ...newTypes];
    return this;
  }

  subjectProperty(key: string, value: any): CredentialBuilder {
    if (!key || typeof key !== 'string') {
      throw new Error("Subject property key must be a non-empty string");
    }
    if (key === 'id' || key === 'type') {
      throw new Error(`Use subject() or subjectType() methods for ${key} property`);
    }
    this.data.credentialSubject[key] = value;
    return this;
  }

  subjectProperties(properties: { [key: string]: any }): CredentialBuilder {
    // Filter out reserved properties
    const { id, type, ...validProperties } = properties;
    if (id || type) {
      console.warn("id and type properties should be set using subject() and subjectType() methods");
    }
    this.data.credentialSubject = { ...this.data.credentialSubject, ...validProperties };
    return this;
  }

  addSchema(id: string, type: string = "JsonSchema"): CredentialBuilder {
    if (!id || !id.startsWith('https://')) {
      throw new Error("Schema ID must be a valid HTTPS URL");
    }
    if (!this.data.credentialSchema) {
      this.data.credentialSchema = [];
    }

    // Check for duplicate schema IDs
    const existingIds = this.data.credentialSchema.map(schema => schema.id);
    if (existingIds.includes(id)) {
      throw new Error(`Schema with ID ${id} already exists`);
    }

    this.data.credentialSchema.push({ id, type });
    return this;
  }

  confirmationKey(kid: string): CredentialBuilder {
    if (!kid || typeof kid !== 'string') {
      throw new Error("Confirmation key ID must be a non-empty string");
    }
    this.data.cnf = { kid };
    return this;
  }

  build(): CredentialDocument {
    if (!this.data.issuer) {
      throw new Error("Credential issuer is required");
    }

    // Create result with properly combined contexts
    const result = { ...this.data };

    // Combine and deduplicate all contexts
    const baseContexts = Array.isArray(this.data["@context"]) ? this.data["@context"] : [this.data["@context"]];
    const allContexts = [...baseContexts, ...this.additionalContexts];
    const uniqueContexts = Array.from(new Set(allContexts));

    // Simplify single context to string
    if (uniqueContexts.length === 1) {
      result["@context"] = uniqueContexts[0];
    } else {
      result["@context"] = uniqueContexts;
    }

    // Simplify single type to string
    if (Array.isArray(result.type) && result.type.length === 1) {
      result.type = result.type[0];
    }

    // Simplify single subject type to string
    if (Array.isArray(result.credentialSubject.type) && result.credentialSubject.type.length === 1) {
      result.credentialSubject.type = result.credentialSubject.type[0];
    }

    // Validate date order if both are present
    if (result.validFrom && result.validUntil) {
      const fromDate = new Date(result.validFrom);
      const untilDate = new Date(result.validUntil);
      if (fromDate >= untilDate) {
        throw new Error("validUntil must be after validFrom");
      }
    }

    return result;
  }

  serialize(mediaType: "application/vc" = "application/vc"): Uint8Array {
    const credential = this.build();
    const jsonString = JSON.stringify(credential);
    return new TextEncoder().encode(jsonString);
  }

  clone(): CredentialBuilder {
    const newBuilder = new EnhancedCredentialBuilder();
    newBuilder.data = JSON.parse(JSON.stringify(this.data));
    newBuilder.additionalContexts = [...this.additionalContexts];
    return newBuilder;
  }

  reset(): CredentialBuilder {
    this.data = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential"],
      issuer: "",
      credentialSubject: {}
    };
    this.additionalContexts = [];
    return this;
  }
}

// Factory function
function createCredentialBuilder(): CredentialBuilder {
  return new EnhancedCredentialBuilder();
}

test("enhanced credential builder with validation", async () => {
  const credential = createCredentialBuilder()
    .issuer("https://manufacturer.example/supplier/123")
    .id("https://manufacturer.example/credentials/production-2024-001")
    .type("ProductionCredential")
    .context("https://w3id.org/traceability/v1")
    .validFrom("2024-01-15T08:00:00Z")
    .validUntil("2024-12-31T23:59:59Z")
    .subject("https://products.example/batch/cotton-001")
    .subjectType("ProductBatch")
    .subjectProperty("productName", "Organic Cotton Batch")
    .subjectProperty("quantity", "500 units")
    .build();

  expect(credential.issuer).toBe("https://manufacturer.example/supplier/123");
  expect(credential.id).toBe("https://manufacturer.example/credentials/production-2024-001");
  expect(credential.type).toEqual(["VerifiableCredential", "ProductionCredential"]);
  expect(credential.credentialSubject.id).toBe("https://products.example/batch/cotton-001");
  expect(credential.credentialSubject.productName).toBe("Organic Cotton Batch");
});

test("builder validation errors", () => {
  const testBuilder = createCredentialBuilder();

  // Test invalid IDs
  expect(() => testBuilder.id("invalid-id")).toThrow("Credential ID must be a valid HTTPS URL");
  expect(() => testBuilder.issuer("invalid-issuer")).toThrow("Credential issuer must be a valid HTTPS URL");
  expect(() => testBuilder.subject("invalid-subject")).toThrow("Subject ID must be a valid HTTPS URL");

  // Test invalid dates
  expect(() => testBuilder.validFrom("invalid-date")).toThrow("validFrom must be a valid ISO 8601 date string");
  expect(() => testBuilder.validUntil("2024-13-45")).toThrow("validUntil must be a valid ISO 8601 date string");

  // Test building without issuer
  expect(() => createCredentialBuilder().build()).toThrow("Credential issuer is required");

  // Test invalid date order
  expect(() => createCredentialBuilder()
    .issuer("https://test.example")
    .validFrom("2024-12-31T23:59:59Z")
    .validUntil("2024-01-01T00:00:00Z")
    .build()
  ).toThrow("validUntil must be after validFrom");

  // Test invalid subject property keys
  expect(() => testBuilder.subjectProperty("", "value")).toThrow("Subject property key must be a non-empty string");
  expect(() => testBuilder.subjectProperty("id", "value")).toThrow("Use subject() or subjectType() methods for id property");

  // Test duplicate schema
  expect(() => createCredentialBuilder()
    .issuer("https://test.example")
    .addSchema("https://example.org/schema.json")
    .addSchema("https://example.org/schema.json") // duplicate
  ).toThrow("Schema with ID https://example.org/schema.json already exists");
});

test("credential builder clone and reset", () => {
  const original = createCredentialBuilder()
    .issuer("https://original.example")
    .type("OriginalCredential")
    .context("https://example.org/original/v1")
    .subject("https://original.example/subject")
    .subjectProperty("originalProperty", "original value");

  // Clone and modify
  const cloned = original.clone()
    .issuer("https://cloned.example")
    .subjectProperty("clonedProperty", "cloned value");

  const originalCred = original.build();
  const clonedCred = cloned.build();

  expect(originalCred.issuer).toBe("https://original.example");
  expect(clonedCred.issuer).toBe("https://cloned.example");
  expect(clonedCred.credentialSubject.originalProperty).toBe("original value"); // Cloned property
  expect(clonedCred.credentialSubject.clonedProperty).toBe("cloned value"); // New property

  // Test reset
  const reset = original.reset()
    .issuer("https://reset.example")
    .subject("https://reset.example/subject");

  const resetCred = reset.build();
  expect(resetCred.issuer).toBe("https://reset.example");
  expect(resetCred.type).toBe("VerifiableCredential"); // Reset to default
  expect(resetCred.credentialSubject.originalProperty).toBeUndefined(); // Reset cleared properties
});

test("context and type deduplication", () => {
  const credential = createCredentialBuilder()
    .issuer("https://test.example")
    .type("TestCredential")
    .type("TestCredential") // duplicate
    .context("https://example.org/test/v1")
    .context("https://example.org/test/v1") // duplicate
    .context("https://www.w3.org/ns/credentials/v2") // duplicate of default
    .subject("https://test.example/subject")
    .subjectType("TestSubject")
    .subjectType("TestSubject") // duplicate
    .build();

  expect(credential.type).toEqual(["VerifiableCredential", "TestCredential"]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://example.org/test/v1"
  ]);
  expect(credential.credentialSubject.type).toBe("TestSubject"); // Single type simplified to string
});

test("credential builder with confirmation key", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const credential = createCredentialBuilder()
    .issuer("https://issuer.example")
    .type("IdentityCredential")
    .confirmationKey(assertionKey.kid!)
    .subject("https://holder.example/did/123")
    .subjectProperty("name", "Supply Chain Entity")
    .build();

  expect(credential.cnf).toEqual({ kid: assertionKey.kid });
});

test("single values simplified to strings", () => {
  const credential = createCredentialBuilder()
    .issuer("https://test.example")
    .type("SingleTypeCredential") // Only one additional type
    .subject("https://test.example/subject")
    .subjectType("SingleSubjectType") // Only one subject type
    .build();

  // Single type should be simplified to string (base + one additional = array, but if only one total it could be string)
  expect(credential.type).toEqual(["VerifiableCredential", "SingleTypeCredential"]); // Still array because of base type
  expect(credential.credentialSubject.type).toBe("SingleSubjectType"); // Single subject type simplified to string
  expect(credential["@context"]).toBe("https://www.w3.org/ns/credentials/v2"); // Single context simplified to string
});

test("supply chain traceability credential scenario", () => {
  // Cotton cultivation credential
  const cultivationCredential = createCredentialBuilder()
    .issuer("https://organic-farm.example/farm/texas-001")
    .id("https://organic-farm.example/credentials/cultivation-2024-spring")
    .type("CultivationCredential")
    .context("https://w3id.org/traceability/v1", "https://w3id.org/agriculture/v1")
    .validFrom("2024-03-01T00:00:00Z")
    .validUntil("2025-03-01T00:00:00Z")
    .addSchema("https://w3id.org/traceability/schemas/CultivationCredential.json", "JsonSchema")
    .subject("https://crops.example/harvest/organic-cotton-spring-2024")
    .subjectType("CottonHarvest")
    .subjectProperties({
      cropType: "Organic Cotton",
      varietyName: "Pima Cotton",
      plantingDate: "2024-03-01",
      harvestDate: "2024-09-15",
      fieldLocation: {
        latitude: 32.7767,
        longitude: -96.7970,
        address: "Rural Route 1, Dallas County, TX"
      },
      organicCertification: "USDA Organic",
      yieldPerAcre: "800 lbs",
      totalYield: "40,000 lbs",
      qualityGrade: "Middling",
      moistureContent: "7.5%"
    })
    .build();

  // Ginning process credential
  const ginningCredential = createCredentialBuilder()
    .issuer("https://cotton-gin.example/facility/dallas")
    .type("ProcessingCredential", "GinningCredential")
    .context("https://w3id.org/traceability/v1")
    .validFrom("2024-09-20T00:00:00Z")
    .subject("https://processing.example/batch/ginned-cotton-2024-001")
    .subjectType("ProcessedCotton")
    .subjectProperties({
      inputMaterial: "https://crops.example/harvest/organic-cotton-spring-2024",
      processType: "Cotton Ginning",
      processingDate: "2024-09-20",
      outputQuantity: "35,000 lbs", // Some loss during processing
      qualityMetrics: {
        fiberLength: "1.125 inches",
        micronaire: "4.2",
        strength: "29.0 g/tex",
        uniformity: "82%"
      },
      baleNumbers: ["B2024001", "B2024002", "B2024003", "B2024004"],
      processingFacility: "https://cotton-gin.example/facility/dallas"
    })
    .build();

  // Textile manufacturing credential
  const manufacturingCredential = createCredentialBuilder()
    .issuer("https://textile-mill.example/facility/georgia")
    .id("https://textile-mill.example/credentials/manufacturing-2024-q4")
    .type("ManufacturingCredential")
    .context("https://w3id.org/traceability/v1")
    .validFrom("2024-10-01T00:00:00Z")
    .subject("https://textiles.example/fabric/organic-cotton-fabric-001")
    .subjectType("CottonFabric")
    .subjectProperties({
      inputMaterial: "https://processing.example/batch/ginned-cotton-2024-001",
      fabricType: "Plain Weave Cotton",
      weight: "5.5 oz/sq yd",
      width: "60 inches",
      yardage: "10,000 yards",
      dyeProcess: "Low-impact reactive dyes",
      colorway: "Natural Undyed",
      manufacturingDate: "2024-10-15",
      qualityControl: {
        tensileStrength: "Pass",
        colorfastness: "Grade 4",
        shrinkage: "< 3%"
      },
      certifications: ["GOTS", "OEKO-TEX Standard 100"]
    })
    .confirmationKey("fabric-batch-key-001")
    .build();

  // Verify all credentials
  expect(cultivationCredential.credentialSubject.cropType).toBe("Organic Cotton");
  expect(cultivationCredential.credentialSubject.fieldLocation.latitude).toBe(32.7767);
  expect(cultivationCredential.credentialSchema).toHaveLength(1);

  expect(ginningCredential.type).toEqual(["VerifiableCredential", "ProcessingCredential", "GinningCredential"]);
  expect(ginningCredential.credentialSubject.baleNumbers).toHaveLength(4);
  expect(ginningCredential.credentialSubject.inputMaterial).toBe("https://crops.example/harvest/organic-cotton-spring-2024");

  expect(manufacturingCredential.credentialSubject.certifications).toEqual(["GOTS", "OEKO-TEX Standard 100"]);
  expect(manufacturingCredential.cnf?.kid).toBe("fabric-batch-key-001");

  // All should have proper contexts
  expect(cultivationCredential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/traceability/v1",
    "https://w3id.org/agriculture/v1"
  ]);
});