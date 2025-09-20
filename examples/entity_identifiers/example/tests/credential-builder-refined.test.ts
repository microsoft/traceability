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
    .issuer("https://navigation.example/provider/123")
    .id("https://navigation.example/credentials/route-2024-001")
    .type("RouteCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .validFrom("2024-01-15T08:00:00Z")
    .validUntil("2024-12-31T23:59:59Z")
    .subject("https://routes.example/optimized/city-001")
    .subjectType("OptimizedRoute")
    .subjectProperty("routeName", "City Center Loop")
    .subjectProperty("distance", "12.5 km")
    .subjectProperty("geometry", {
      type: "LineString",
      coordinates: [
        [-122.4194, 37.7749],
        [-122.4094, 37.7849],
        [-122.3994, 37.7949]
      ]
    })
    .build();

  expect(credential.issuer).toBe("https://navigation.example/provider/123");
  expect(credential.id).toBe("https://navigation.example/credentials/route-2024-001");
  expect(credential.type).toEqual(["VerifiableCredential", "RouteCredential"]);
  expect(credential.credentialSubject.id).toBe("https://routes.example/optimized/city-001");
  expect(credential.credentialSubject.routeName).toBe("City Center Loop");
  expect(credential.credentialSubject.geometry.type).toBe("LineString");
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
    .type("RouteCredential")
    .type("RouteCredential") // duplicate
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld") // duplicate
    .context("https://www.w3.org/ns/credentials/v2") // duplicate of default
    .subject("https://test.example/route")
    .subjectType("TestRoute")
    .subjectType("TestRoute") // duplicate
    .subjectProperty("geometry", {
      type: "Point",
      coordinates: [-122.4194, 37.7749]
    })
    .build();

  expect(credential.type).toEqual(["VerifiableCredential", "RouteCredential"]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ]);
  expect(credential.credentialSubject.type).toBe("TestRoute"); // Single type simplified to string
});

test("credential builder with confirmation key", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const credential = createCredentialBuilder()
    .issuer("https://gps.example/tracking")
    .type("LocationCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .confirmationKey(assertionKey.kid!)
    .subject("https://vehicles.example/truck/123")
    .subjectType("Vehicle")
    .subjectProperty("vehicleId", "TRUCK-123")
    .subjectProperty("currentPosition", {
      type: "Point",
      coordinates: [-122.4194, 37.7749]
    })
    .build();

  expect(credential.cnf).toEqual({ kid: assertionKey.kid });
  expect(credential.credentialSubject.currentPosition.type).toBe("Point");
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

test("transportation and route management credential scenario", () => {
  // Route planning credential
  const routePlanningCredential = createCredentialBuilder()
    .issuer("https://mapping.example/planning/service")
    .id("https://mapping.example/credentials/route-plan-2024-spring")
    .type("RoutePlanningCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld", "https://example.org/logistics/v1")
    .validFrom("2024-03-01T00:00:00Z")
    .validUntil("2025-03-01T00:00:00Z")
    .addSchema("https://example.org/schemas/RoutePlanningCredential.json", "JsonSchema")
    .subject("https://routes.example/plan/regional-delivery-2024")
    .subjectType("RegionalDeliveryPlan")
    .subjectProperties({
      planName: "Regional Hub Distribution",
      coverage: "San Francisco Bay Area",
      planningDate: "2024-03-01",
      numberOfRoutes: 15,
      serviceArea: {
        type: "Polygon",
        coordinates: [[
          [-122.5, 37.7],
          [-122.3, 37.7],
          [-122.3, 37.9],
          [-122.5, 37.9],
          [-122.5, 37.7]
        ]]
      },
      totalDistance: "450 km",
      estimatedVehicles: 12,
      operatingHours: "06:00-18:00",
      optimization: "Shortest Distance with Traffic"
    })
    .build();

  // Traffic monitoring credential
  const trafficCredential = createCredentialBuilder()
    .issuer("https://traffic.example/monitoring/bay-area")
    .type("TrafficMonitoringCredential", "RouteOptimizationCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .validFrom("2024-03-15T00:00:00Z")
    .subject("https://routes.example/optimized/morning-rush-001")
    .subjectType("OptimizedRoute")
    .subjectProperties({
      routeId: "MR-001",
      optimizationTime: "2024-03-15T06:00:00Z",
      trafficData: "Real-time congestion analysis",
      routeGeometry: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749], // San Francisco
          [-122.2711, 37.8044], // Oakland
          [-122.0822, 37.4220], // San Jose
          [-122.4194, 37.7749]  // Return to SF
        ]
      },
      trafficHotspots: [
        {
          type: "Point",
          coordinates: [-122.4094, 37.7849],
          description: "Bay Bridge - Heavy congestion"
        }
      ],
      alternativeRoutes: 3,
      travelTimeReduction: "25%"
    })
    .build();

  // Vehicle tracking credential
  const vehicleTrackingCredential = createCredentialBuilder()
    .issuer("https://fleet.example/tracking/central")
    .id("https://fleet.example/credentials/tracking-2024-q2")
    .type("VehicleTrackingCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .validFrom("2024-04-01T00:00:00Z")
    .subject("https://vehicles.example/fleet/electric-van-007")
    .subjectType("ElectricDeliveryVan")
    .subjectProperties({
      vehicleId: "EV-007",
      assignedRoute: "https://routes.example/optimized/morning-rush-001",
      batteryLevel: "85%",
      currentTrip: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749, 0, 1710484800],    // Start: SF, timestamp
          [-122.3500, 37.7900, 0, 1710486000],    // 20 mins later
          [-122.2711, 37.8044, 0, 1710487800],    // Oakland, 50 mins
          [-122.1500, 37.6000, 0, 1710489600]     // Current position, 80 mins
        ]
      },
      deliveryStatus: "In Progress",
      completedStops: 8,
      remainingStops: 4,
      estimatedCompletion: "2024-03-15T14:30:00Z"
    })
    .confirmationKey("vehicle-tracking-key-007")
    .build();

  // Verify all credentials
  expect(routePlanningCredential.credentialSubject.planName).toBe("Regional Hub Distribution");
  expect(routePlanningCredential.credentialSubject.serviceArea.type).toBe("Polygon");
  expect(routePlanningCredential.credentialSchema).toHaveLength(1);

  expect(trafficCredential.type).toEqual(["VerifiableCredential", "TrafficMonitoringCredential", "RouteOptimizationCredential"]);
  expect(trafficCredential.credentialSubject.trafficHotspots).toHaveLength(1);
  expect(trafficCredential.credentialSubject.routeGeometry.coordinates).toHaveLength(4);

  expect(vehicleTrackingCredential.credentialSubject.vehicleId).toBe("EV-007");
  expect(vehicleTrackingCredential.credentialSubject.batteryLevel).toBe("85%");
  expect(vehicleTrackingCredential.cnf?.kid).toBe("vehicle-tracking-key-007");

  // All should have proper GeoJSON contexts
  expect(routePlanningCredential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld",
    "https://example.org/logistics/v1"
  ]);
});