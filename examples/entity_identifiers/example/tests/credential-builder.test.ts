import { test, expect } from "bun:test";
import { generatePrivateKey, exportPublicKey } from "../src/key/management";

// This test demonstrates the desired builder pattern interface for credentials
// We'll iterate on this design before implementing the full builder

interface CredentialBuilder {
  // Core identity
  context(...contexts: string[]): CredentialBuilder;
  id(id: string): CredentialBuilder;
  type(...types: string[]): CredentialBuilder;
  issuer(issuer: string): CredentialBuilder;

  // Validity periods
  validFrom(date: string): CredentialBuilder;
  validUntil(date: string): CredentialBuilder;

  // Subject - support building incrementally
  subjectId(id: string): CredentialBuilder;
  subjectType(...types: string[]): CredentialBuilder;
  subjectProperty(key: string, value: any): CredentialBuilder;
  subjectProperties(properties: { [key: string]: any }): CredentialBuilder;

  // Schema references
  addSchema(id: string, type: string): CredentialBuilder;

  // Key confirmation
  confirmationKey(kid: string): CredentialBuilder;

  // Build and serialize
  build(): any; // Returns the credential object
  serialize(mediaType: string): Uint8Array; // Serializes to specific media type
}

// Mock implementation for testing the interface
class MockCredentialBuilder implements CredentialBuilder {
  private data: any = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    credentialSubject: {}
  };

  context(...contexts: string[]): CredentialBuilder {
    // Deduplicate and add contexts
    const existingContexts = Array.isArray(this.data["@context"]) ? this.data["@context"] : [this.data["@context"]];
    const newContexts = contexts.filter(ctx => !existingContexts.includes(ctx));
    this.data["@context"] = [...existingContexts, ...newContexts];
    return this;
  }

  id(id: string): CredentialBuilder {
    this.data.id = id;
    return this;
  }

  type(...types: string[]): CredentialBuilder {
    const existingTypes = Array.isArray(this.data.type) ? this.data.type : [this.data.type];
    const newTypes = types.filter(type => !existingTypes.includes(type));
    this.data.type = [...existingTypes, ...newTypes];
    return this;
  }

  issuer(issuer: string): CredentialBuilder {
    this.data.issuer = issuer;
    return this;
  }

  validFrom(date: string): CredentialBuilder {
    this.data.validFrom = date;
    return this;
  }

  validUntil(date: string): CredentialBuilder {
    this.data.validUntil = date;
    return this;
  }

  subjectId(id: string): CredentialBuilder {
    this.data.credentialSubject.id = id;
    return this;
  }

  subjectType(...types: string[]): CredentialBuilder {
    const existingTypes = this.data.credentialSubject.type
      ? (Array.isArray(this.data.credentialSubject.type) ? this.data.credentialSubject.type : [this.data.credentialSubject.type])
      : [];
    const newTypes = types.filter(type => !existingTypes.includes(type));
    this.data.credentialSubject.type = [...existingTypes, ...newTypes];
    return this;
  }

  subjectProperty(key: string, value: any): CredentialBuilder {
    this.data.credentialSubject[key] = value;
    return this;
  }

  subjectProperties(properties: { [key: string]: any }): CredentialBuilder {
    this.data.credentialSubject = { ...this.data.credentialSubject, ...properties };
    return this;
  }

  addSchema(id: string, type: string): CredentialBuilder {
    if (!this.data.credentialSchema) {
      this.data.credentialSchema = [];
    }
    this.data.credentialSchema.push({ id, type });
    return this;
  }

  confirmationKey(kid: string): CredentialBuilder {
    this.data.cnf = { kid };
    return this;
  }

  build(): any {
    if (!this.data.issuer) {
      throw new Error("Credential issuer is required");
    }

    // Clean up empty arrays and objects
    const result = { ...this.data };
    if (Array.isArray(result.type) && result.type.length === 1) {
      result.type = result.type[0];
    }
    if (Array.isArray(result["@context"]) && result["@context"].length === 1) {
      result["@context"] = result["@context"][0];
    }

    return result;
  }

  serialize(mediaType: string): Uint8Array {
    const credential = this.build();

    switch (mediaType) {
      case "application/vc":
        const jsonString = JSON.stringify(credential);
        return new TextEncoder().encode(jsonString);

      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }
  }
}

// Factory function to create builder
function createCredentialBuilder(): CredentialBuilder {
  return new MockCredentialBuilder();
}

test("credential builder basic usage", async () => {
  // Build a basic supply chain credential
  const builder = createCredentialBuilder()
    .issuer("https://manufacturer.example/supplier/123")
    .type("ProductionCredential")
    .context("https://w3id.org/traceability/v1")
    .subjectId("https://products.example/items/organic-cotton-shirt-001")
    .subjectType("Product")
    .subjectProperty("productName", "Organic Cotton T-Shirt")
    .subjectProperty("batchNumber", "OCS-2024-001")
    .subjectProperty("materialComposition", "100% Organic Cotton");

  const credential = builder.build();

  // Verify the built credential
  expect(credential.issuer).toBe("https://manufacturer.example/supplier/123");
  expect(credential.type).toEqual(["VerifiableCredential", "ProductionCredential"]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/traceability/v1"
  ]);
  expect(credential.credentialSubject.id).toBe("https://products.example/items/organic-cotton-shirt-001");
  expect(credential.credentialSubject.type).toEqual(["Product"]);
  expect(credential.credentialSubject.productName).toBe("Organic Cotton T-Shirt");
  expect(credential.credentialSubject.batchNumber).toBe("OCS-2024-001");
});

test("credential builder with validity periods and schema", async () => {
  const credential = createCredentialBuilder()
    .issuer("https://certifier.example/org/gots")
    .id("https://certifier.example/credentials/gots-2024-001")
    .type("CertificationCredential")
    .context("https://w3id.org/traceability/v1")
    .validFrom("2024-01-01T00:00:00Z")
    .validUntil("2025-01-01T00:00:00Z")
    .addSchema("https://example.org/schemas/gots-certification.json", "JsonSchema")
    .subjectId("https://manufacturer.example/facility/001")
    .subjectType("ManufacturingFacility")
    .subjectProperty("certificationLevel", "GOTS Level 1")
    .subjectProperty("certificationNumber", "GOTS-2024-001")
    .subjectProperty("auditDate", "2024-01-15T10:00:00Z")
    .build();

  expect(credential.id).toBe("https://certifier.example/credentials/gots-2024-001");
  expect(credential.validFrom).toBe("2024-01-01T00:00:00Z");
  expect(credential.validUntil).toBe("2025-01-01T00:00:00Z");
  expect(credential.credentialSchema).toHaveLength(1);
  expect(credential.credentialSchema[0]).toEqual({
    id: "https://example.org/schemas/gots-certification.json",
    type: "JsonSchema"
  });
});

test("credential builder incremental subject building", async () => {
  const builder = createCredentialBuilder()
    .issuer("https://logistics.example/shipper/dhl")
    .type("ShippingCredential")
    .subjectId("https://shipments.example/tracking/ABC123456")
    .subjectType("Shipment");

  // Add properties incrementally
  builder
    .subjectProperty("origin", "Atlanta, GA")
    .subjectProperty("destination", "New York, NY")
    .subjectProperty("trackingNumber", "ABC123456");

  // Add more properties in bulk
  builder.subjectProperties({
    estimatedDelivery: "2024-01-20T15:00:00Z",
    carrier: "DHL Express",
    weight: "2.5 kg",
    dimensions: { length: 30, width: 20, height: 15, unit: "cm" }
  });

  // Add another individual property
  builder.subjectProperty("temperature", "ambient");

  const credential = builder.build();

  expect(credential.credentialSubject.origin).toBe("Atlanta, GA");
  expect(credential.credentialSubject.destination).toBe("New York, NY");
  expect(credential.credentialSubject.estimatedDelivery).toBe("2024-01-20T15:00:00Z");
  expect(credential.credentialSubject.dimensions.length).toBe(30);
  expect(credential.credentialSubject.temperature).toBe("ambient");
});

test("credential builder with multiple types and contexts", async () => {
  const credential = createCredentialBuilder()
    .issuer("https://multi-org.example/issuer")
    .type("QualityCredential", "SustainabilityCredential")
    .context("https://w3id.org/traceability/v1", "https://example.org/sustainability/v1")
    .context("https://example.org/quality/v1") // Additional context
    .subjectId("https://products.example/batch/sustainable-001")
    .subjectType("ProductBatch", "SustainableProduct")
    .subjectProperty("qualityScore", 95)
    .subjectProperty("sustainabilityRating", "A+")
    .build();

  expect(credential.type).toEqual([
    "VerifiableCredential",
    "QualityCredential",
    "SustainabilityCredential"
  ]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/traceability/v1",
    "https://example.org/sustainability/v1",
    "https://example.org/quality/v1"
  ]);
  expect(credential.credentialSubject.type).toEqual(["ProductBatch", "SustainableProduct"]);
});

test("credential builder with confirmation key", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const credential = createCredentialBuilder()
    .issuer("https://issuer.example")
    .type("IdentityCredential")
    .confirmationKey(assertionKey.kid!)
    .subjectId("https://holder.example/did/123")
    .subjectProperty("name", "Supply Chain Entity")
    .build();

  expect(credential.cnf).toEqual({ kid: assertionKey.kid });
});

test("credential builder serialization", async () => {
  const serialized = createCredentialBuilder()
    .issuer("https://test.example/issuer")
    .type("TestCredential")
    .subjectId("https://test.example/subject")
    .subjectProperty("testValue", "hello world")
    .serialize("application/vc");

  expect(serialized).toBeInstanceOf(Uint8Array);

  // Verify it can be decoded back to JSON
  const jsonString = new TextDecoder().decode(serialized);
  const parsed = JSON.parse(jsonString);
  expect(parsed.issuer).toBe("https://test.example/issuer");
  expect(parsed.credentialSubject.testValue).toBe("hello world");
});

test("credential builder validation errors", () => {
  // Building without issuer should throw
  expect(() => createCredentialBuilder()
    .type("TestCredential")
    .subjectId("https://test.example")
    .build()
  ).toThrow("Credential issuer is required");

  // Invalid media type
  expect(() => createCredentialBuilder()
    .issuer("https://test.example")
    .serialize("application/xml")
  ).toThrow("Unsupported media type: application/xml");
});

test("credential builder deduplicates contexts and types", () => {
  const credential = createCredentialBuilder()
    .issuer("https://test.example")
    .type("TestCredential")
    .type("TestCredential") // duplicate
    .context("https://example.org/test/v1")
    .context("https://example.org/test/v1") // duplicate
    .context("https://www.w3.org/ns/credentials/v2") // duplicate of default
    .subjectId("https://test.example/subject")
    .subjectType("TestSubject")
    .subjectType("TestSubject") // duplicate
    .build();

  expect(credential.type).toEqual(["VerifiableCredential", "TestCredential"]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://example.org/test/v1"
  ]);
  expect(credential.credentialSubject.type).toEqual(["TestSubject"]);
});

test("supply chain end-to-end credential scenario", () => {
  // Production credential from manufacturer
  const productionCredential = createCredentialBuilder()
    .issuer("https://textile-mill.example/facility/001")
    .id("https://textile-mill.example/credentials/production-2024-001")
    .type("ProductionCredential")
    .context("https://w3id.org/traceability/v1")
    .validFrom("2024-01-15T08:00:00Z")
    .addSchema("https://w3id.org/traceability/schemas/ProductionCredential.json", "JsonSchema")
    .subjectId("https://products.example/batch/organic-cotton-2024-001")
    .subjectType("ProductBatch")
    .subjectProperties({
      materialType: "Organic Cotton",
      quantity: "500 units",
      productionDate: "2024-01-15",
      qualityGrade: "Premium",
      certifications: ["GOTS", "OEKO-TEX Standard 100"]
    })
    .build();

  // Quality inspection credential from third party
  const qualityCredential = createCredentialBuilder()
    .issuer("https://quality-labs.example/lab/central")
    .id("https://quality-labs.example/credentials/inspection-2024-001")
    .type("QualityInspectionCredential")
    .context("https://w3id.org/traceability/v1")
    .validFrom("2024-01-16T14:00:00Z")
    .validUntil("2025-01-16T14:00:00Z")
    .subjectId("https://products.example/batch/organic-cotton-2024-001")
    .subjectType("ProductBatch")
    .subjectProperties({
      inspectionDate: "2024-01-16T14:00:00Z",
      inspector: "Certified Quality Inspector #QI-2024-05",
      testResults: {
        tensileStrength: "Pass",
        colorFastness: "Pass",
        shrinkageTest: "Pass"
      },
      overallGrade: "A",
      complianceStatus: "Fully Compliant"
    })
    .build();

  // Shipping credential from logistics provider
  const shippingCredential = createCredentialBuilder()
    .issuer("https://logistics.example/carrier/global-express")
    .type("ShippingCredential")
    .context("https://w3id.org/traceability/v1")
    .subjectId("https://shipments.example/tracking/TE2024001")
    .subjectType("Shipment")
    .subjectProperties({
      trackingNumber: "TE2024001",
      origin: {
        facility: "https://textile-mill.example/facility/001",
        address: "789 Textile Way, Atlanta, GA 30309"
      },
      destination: {
        facility: "https://distribution.example/warehouse/east",
        address: "456 Warehouse Dr, Richmond, VA 23230"
      },
      shipmentDate: "2024-01-17T09:00:00Z",
      estimatedArrival: "2024-01-19T15:00:00Z",
      packagedItems: ["https://products.example/batch/organic-cotton-2024-001"]
    })
    .build();

  // Verify all credentials have proper structure
  expect(productionCredential.issuer).toBe("https://textile-mill.example/facility/001");
  expect(productionCredential.credentialSubject.certifications).toEqual(["GOTS", "OEKO-TEX Standard 100"]);

  expect(qualityCredential.credentialSubject.testResults.tensileStrength).toBe("Pass");
  expect(qualityCredential.validUntil).toBe("2025-01-16T14:00:00Z");

  expect(shippingCredential.credentialSubject.trackingNumber).toBe("TE2024001");
  expect(shippingCredential.credentialSubject.packagedItems).toContain("https://products.example/batch/organic-cotton-2024-001");

  // All should have proper contexts
  expect(productionCredential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/traceability/v1"
  ]);
});