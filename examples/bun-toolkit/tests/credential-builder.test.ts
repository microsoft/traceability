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
  // Build a basic route credential
  const builder = createCredentialBuilder()
    .issuer("https://logistics.example/carrier/123")
    .type("RouteCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .subjectId("https://routes.example/delivery-route-001")
    .subjectType("Route")
    .subjectProperty("name", "Downtown Delivery Route")
    .subjectProperty("description", "Primary delivery route through downtown area")
    .subjectProperty("geometry", {
      type: "LineString",
      coordinates: [
        [-122.4194, 37.7749],
        [-122.4094, 37.7849],
        [-122.3994, 37.7949]
      ]
    });

  const credential = builder.build();

  // Verify the built credential
  expect(credential.issuer).toBe("https://logistics.example/carrier/123");
  expect(credential.type).toEqual(["VerifiableCredential", "RouteCredential"]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ]);
  expect(credential.credentialSubject.id).toBe("https://routes.example/delivery-route-001");
  expect(credential.credentialSubject.type).toEqual(["Route"]);
  expect(credential.credentialSubject.name).toBe("Downtown Delivery Route");
  expect(credential.credentialSubject.geometry.type).toBe("LineString");
});

test("credential builder with validity periods and schema", async () => {
  const credential = createCredentialBuilder()
    .issuer("https://transport.example/authority/nyc")
    .id("https://transport.example/credentials/route-permit-2024-001")
    .type("RoutePermitCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .validFrom("2024-01-01T00:00:00Z")
    .validUntil("2025-01-01T00:00:00Z")
    .addSchema("https://example.org/schemas/route-permit.json", "JsonSchema")
    .subjectId("https://routes.example/commercial-route/downtown-001")
    .subjectType("CommercialRoute")
    .subjectProperty("permitNumber", "RP-NYC-2024-001")
    .subjectProperty("routeType", "Commercial Delivery")
    .subjectProperty("authorizedVehicles", ["truck", "van"])
    .subjectProperty("geometry", {
      type: "MultiLineString",
      coordinates: [
        [[-74.0059, 40.7128], [-74.0000, 40.7200]],
        [[-74.0000, 40.7200], [-73.9950, 40.7300]]
      ]
    })
    .build();

  expect(credential.id).toBe("https://transport.example/credentials/route-permit-2024-001");
  expect(credential.validFrom).toBe("2024-01-01T00:00:00Z");
  expect(credential.validUntil).toBe("2025-01-01T00:00:00Z");
  expect(credential.credentialSchema).toHaveLength(1);
  expect(credential.credentialSchema[0]).toEqual({
    id: "https://example.org/schemas/route-permit.json",
    type: "JsonSchema"
  });
});

test("credential builder incremental subject building", async () => {
  const builder = createCredentialBuilder()
    .issuer("https://mapping.example/service/osm")
    .type("RouteOptimizationCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .subjectId("https://routes.example/optimized/delivery-001")
    .subjectType("OptimizedRoute");

  // Add properties incrementally
  builder
    .subjectProperty("routeName", "Multi-Stop Delivery Route")
    .subjectProperty("startLocation", "Distribution Center")
    .subjectProperty("endLocation", "Distribution Center");

  // Add more properties in bulk
  builder.subjectProperties({
    totalDistance: "45.2 km",
    estimatedDuration: "3h 15m",
    numberOfStops: 8,
    optimizationMethod: "Shortest Path Algorithm"
  });

  // Add GeoJSON geometry
  builder.subjectProperty("geometry", {
    type: "LineString",
    coordinates: [
      [-122.4194, 37.7749], // Start: Distribution Center
      [-122.4094, 37.7849], // Stop 1
      [-122.3994, 37.7949], // Stop 2
      [-122.3894, 37.8049], // Stop 3
      [-122.4194, 37.7749]  // End: Back to Distribution Center
    ]
  });

  const credential = builder.build();

  expect(credential.credentialSubject.routeName).toBe("Multi-Stop Delivery Route");
  expect(credential.credentialSubject.totalDistance).toBe("45.2 km");
  expect(credential.credentialSubject.numberOfStops).toBe(8);
  expect(credential.credentialSubject.geometry.type).toBe("LineString");
  expect(credential.credentialSubject.geometry.coordinates).toHaveLength(5);
});

test("credential builder with multiple types and contexts", async () => {
  const credential = createCredentialBuilder()
    .issuer("https://navigation.example/issuer")
    .type("RouteCredential", "TrafficCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld", "https://example.org/traffic/v1")
    .context("https://example.org/navigation/v1") // Additional context
    .subjectId("https://routes.example/monitored/highway-101")
    .subjectType("MonitoredRoute", "HighwaySegment")
    .subjectProperty("trafficLevel", "moderate")
    .subjectProperty("averageSpeed", "65 mph")
    .subjectProperty("geometry", {
      type: "LineString",
      coordinates: [
        [-122.4, 37.7],
        [-122.3, 37.8],
        [-122.2, 37.9]
      ]
    })
    .build();

  expect(credential.type).toEqual([
    "VerifiableCredential",
    "RouteCredential",
    "TrafficCredential"
  ]);
  expect(credential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld",
    "https://example.org/traffic/v1",
    "https://example.org/navigation/v1"
  ]);
  expect(credential.credentialSubject.type).toEqual(["MonitoredRoute", "HighwaySegment"]);
});

test("credential builder with confirmation key", async () => {
  const assertionKey = await exportPublicKey(await generatePrivateKey("ES256"));

  const credential = createCredentialBuilder()
    .issuer("https://gps.example/provider")
    .type("LocationCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .confirmationKey(assertionKey.kid!)
    .subjectId("https://vehicles.example/fleet/truck-001")
    .subjectType("Vehicle")
    .subjectProperty("vehicleId", "TRUCK-001")
    .subjectProperty("currentLocation", {
      type: "Point",
      coordinates: [-122.4194, 37.7749]
    })
    .build();

  expect(credential.cnf).toEqual({ kid: assertionKey.kid });
  expect(credential.credentialSubject.currentLocation.type).toBe("Point");
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

test("transportation and routing end-to-end credential scenario", () => {
  // Route planning credential from mapping service
  const routePlanningCredential = createCredentialBuilder()
    .issuer("https://mapping.example/service/001")
    .id("https://mapping.example/credentials/route-plan-2024-001")
    .type("RoutePlanCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .validFrom("2024-01-15T08:00:00Z")
    .addSchema("https://example.org/schemas/RoutePlanCredential.json", "JsonSchema")
    .subjectId("https://routes.example/plan/delivery-run-001")
    .subjectType("DeliveryRoute")
    .subjectProperties({
      routeName: "Daily Delivery Circuit",
      plannedDate: "2024-01-15",
      totalDistance: "85.3 km",
      estimatedDuration: "4h 30m",
      numberOfStops: 12,
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749], // Depot
          [-122.4094, 37.7849], // Stop 1
          [-122.3994, 37.7949], // Stop 2
          [-122.3894, 37.8049], // Stop 3
          [-122.4194, 37.7749]  // Return to depot
        ]
      }
    })
    .build();

  // Traffic analysis credential from traffic monitoring system
  const trafficCredential = createCredentialBuilder()
    .issuer("https://traffic.example/monitoring/central")
    .id("https://traffic.example/credentials/analysis-2024-001")
    .type("TrafficAnalysisCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .validFrom("2024-01-15T14:00:00Z")
    .validUntil("2024-01-15T18:00:00Z")
    .subjectId("https://routes.example/plan/delivery-run-001")
    .subjectType("DeliveryRoute")
    .subjectProperties({
      analysisTime: "2024-01-15T14:00:00Z",
      trafficConditions: "moderate",
      averageSpeed: "45 km/h",
      congestionPoints: [
        {
          type: "Point",
          coordinates: [-122.4094, 37.7849],
          description: "Construction zone - 10 min delay"
        },
        {
          type: "Point",
          coordinates: [-122.3994, 37.7949],
          description: "School zone - reduced speed"
        }
      ],
      recommendedAdjustments: ["Use alternate route for stop 2", "Allow extra 15 minutes"]
    })
    .build();

  // Vehicle tracking credential from GPS provider
  const trackingCredential = createCredentialBuilder()
    .issuer("https://gps.example/fleet-tracking")
    .type("VehicleTrackingCredential")
    .context("https://geojson.org/geojson-ld/geojson-context.jsonld")
    .subjectId("https://vehicles.example/fleet/van-007")
    .subjectType("DeliveryVehicle")
    .subjectProperties({
      vehicleId: "VAN-007",
      driverId: "D-2024-042",
      routeAssigned: "https://routes.example/plan/delivery-run-001",
      actualPath: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749, 0],    // Start time: 08:00
          [-122.4144, 37.7799, 15],   // 15 mins
          [-122.4094, 37.7849, 35],   // 35 mins (delayed by construction)
          [-122.4044, 37.7899, 50],   // 50 mins
          [-122.3994, 37.7949, 75],   // 1h 15m
          [-122.3944, 37.7999, 90],   // 1h 30m
          [-122.4194, 37.7749, 120]   // Return: 2h (ahead of schedule)
        ]
      },
      departureTime: "2024-01-15T08:00:00Z",
      completionTime: "2024-01-15T10:00:00Z",
      actualDistance: "82.1 km"
    })
    .build();

  // Verify all credentials have proper structure
  expect(routePlanningCredential.issuer).toBe("https://mapping.example/service/001");
  expect(routePlanningCredential.credentialSubject.numberOfStops).toBe(12);
  expect(routePlanningCredential.credentialSubject.geometry.type).toBe("LineString");

  expect(trafficCredential.credentialSubject.trafficConditions).toBe("moderate");
  expect(trafficCredential.credentialSubject.congestionPoints).toHaveLength(2);
  expect(trafficCredential.validUntil).toBe("2024-01-15T18:00:00Z");

  expect(trackingCredential.credentialSubject.vehicleId).toBe("VAN-007");
  expect(trackingCredential.credentialSubject.actualPath.coordinates).toHaveLength(7);
  expect(trackingCredential.credentialSubject.actualDistance).toBe("82.1 km");

  // All should have proper GeoJSON contexts
  expect(routePlanningCredential["@context"]).toEqual([
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ]);
});