/**
 * Unit tests for entity report generation
 */

import { test, expect, describe } from "bun:test";
import {
  generateEntityReport,
  generateControllerDocumentSection,
  generateGeoJSONSection,
  generateInvestigationReport,
  validateControllerDocument,
  type EntityReportOptions,
  type ControllerValidationResult
} from "./entity-report";

// Mock controller document with GeoJSON
const mockControllerDocument = {
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://test-entity.example/entity/test-001",
  "verificationMethod": [
    {
      "id": "https://test-entity.example/entity/test-001#test-key",
      "type": "JsonWebKey",
      "controller": "https://test-entity.example/entity/test-001",
      "publicKeyJwk": {
        "kid": "test-key",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "test-x",
        "y": "test-y",
        "key_ops": ["verify"]
      }
    }
  ],
  "assertionMethod": ["https://test-entity.example/entity/test-001#test-key"],
  "authentication": [],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-64.6208, 18.4167]
      },
      "properties": {
        "name": "Test Entity Headquarters",
        "type": "Test Company",
        "role": "headquarters"
      }
    }
  ]
};

const mockValidationResult: ControllerValidationResult = {
  isValid: true
};

const mockInvalidValidationResult: ControllerValidationResult = {
  isValid: false,
  errorMessage: "Invalid document structure"
};

describe("Entity Report Generation", () => {
  test("generateControllerDocumentSection creates proper collapsible section", () => {
    const section = generateControllerDocumentSection(mockControllerDocument);

    expect(section).toContain('<details>');
    expect(section).toContain('<summary>📄 View Controller Document</summary>');
    expect(section).toContain('```json');
    expect(section).toContain('"id": "https://test-entity.example/entity/test-001"');
    expect(section).toContain('</details>');
    expect(section).toContain(JSON.stringify(mockControllerDocument, null, 2));
  });

  test("generateGeoJSONSection creates proper collapsible section with analysis", () => {
    const section = generateGeoJSONSection(mockControllerDocument);

    expect(section).toContain('<details>');
    expect(section).toContain('<summary>📍 View Geographic Analysis</summary>');
    expect(section).toContain('</details>');
    expect(section).toContain('Geographic Analysis');
    expect(section).toContain('FeatureCollection');
    expect(section).toContain('Test Entity Headquarters');
  });

  test("generateGeoJSONSection handles documents without geographic data", () => {
    const documentWithoutGeo = {
      ...mockControllerDocument,
      type: "SimpleDocument",
      features: undefined
    };
    delete documentWithoutGeo.features;

    const section = generateGeoJSONSection(documentWithoutGeo);

    expect(section).toContain('<details>');
    expect(section).toContain('<summary>📍 View Geographic Analysis</summary>');
    expect(section).toContain('</details>');
    // The analyzer still processes it, just marks it as "invalid" type
    expect(section).toContain('Geographic Analysis');
  });

  test("generateEntityReport creates complete entity section with valid controller", () => {
    const options: EntityReportOptions = {
      entityName: "Test Entity Ltd",
      controllerDocument: mockControllerDocument,
      validationResult: mockValidationResult
    };

    const report = generateEntityReport(options);

    // Check header
    expect(report).toContain('### ✅ Test Entity Ltd');
    expect(report).toContain('**Controller Document Status:** Valid');

    // Check controller document section
    expect(report).toContain('📄 View Controller Document');
    expect(report).toContain('```json');

    // Check GeoJSON section
    expect(report).toContain('📍 View Geographic Analysis');
    expect(report).toContain('Geographic Analysis');
  });

  test("generateEntityReport creates complete entity section with invalid controller", () => {
    const options: EntityReportOptions = {
      entityName: "Invalid Entity Ltd",
      controllerDocument: mockControllerDocument,
      validationResult: mockInvalidValidationResult
    };

    const report = generateEntityReport(options);

    // Check header shows invalid status
    expect(report).toContain('### ❌ Invalid Entity Ltd');
    expect(report).toContain('**Controller Document Status:** Invalid');

    // Should still include controller document
    expect(report).toContain('📄 View Controller Document');

    // Should not include GeoJSON analysis for invalid controllers
    expect(report).not.toContain('📍 View Geographic Analysis');
  });

  test("generateEntityReport respects include options", () => {
    const options: EntityReportOptions = {
      entityName: "Test Entity Ltd",
      controllerDocument: mockControllerDocument,
      validationResult: mockValidationResult,
      includeControllerDocument: false,
      includeGeoJSONAnalysis: false
    };

    const report = generateEntityReport(options);

    // Should have header but not sections
    expect(report).toContain('### ✅ Test Entity Ltd');
    expect(report).toContain('**Controller Document Status:** Valid');
    expect(report).not.toContain('📄 View Controller Document');
    expect(report).not.toContain('📍 View Geographic Analysis');
  });

  test("generateInvestigationReport creates complete multi-entity report", () => {
    const entities: EntityReportOptions[] = [
      {
        entityName: "Entity One",
        controllerDocument: mockControllerDocument,
        validationResult: mockValidationResult
      },
      {
        entityName: "Entity Two",
        controllerDocument: mockControllerDocument,
        validationResult: mockValidationResult
      }
    ];

    const report = generateInvestigationReport(
      "Test Investigation Report",
      "This is a test investigation summary.",
      entities
    );

    // Check report structure
    expect(report).toContain('# Test Investigation Report');
    expect(report).toContain('## Executive Summary');
    expect(report).toContain('This is a test investigation summary.');
    expect(report).toContain('## Step 1: Identify Entities');
    expect(report).toContain('## Investigation Summary');

    // Check entities are included
    expect(report).toContain('### ✅ Entity One');
    expect(report).toContain('### ✅ Entity Two');

    // Check final summary
    expect(report).toContain('🔍 Entity identification completed');
  });
});

describe("Controller Document Validation", () => {
  test("validateControllerDocument accepts valid controller", async () => {
    const result = await validateControllerDocument(mockControllerDocument, "test-schema.yaml");

    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  test("validateControllerDocument rejects null/undefined controller", async () => {
    const result1 = await validateControllerDocument(null, "test-schema.yaml");
    const result2 = await validateControllerDocument(undefined, "test-schema.yaml");

    expect(result1.isValid).toBe(false);
    expect(result1.errorMessage).toContain("Invalid controller document format");
    expect(result2.isValid).toBe(false);
    expect(result2.errorMessage).toContain("Invalid controller document format");
  });

  test("validateControllerDocument rejects controller missing required fields", async () => {
    const invalidController = { someField: "value" };
    const result = await validateControllerDocument(invalidController, "test-schema.yaml");

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("Missing required fields");
  });

  test("validateControllerDocument rejects non-object controller", async () => {
    const result1 = await validateControllerDocument("not-an-object", "test-schema.yaml");
    const result2 = await validateControllerDocument(123, "test-schema.yaml");

    expect(result1.isValid).toBe(false);
    expect(result1.errorMessage).toContain("Invalid controller document format");
    expect(result2.isValid).toBe(false);
    expect(result2.errorMessage).toContain("Invalid controller document format");
  });
});

describe("Section Generation Edge Cases", () => {
  test("generateControllerDocumentSection handles empty objects", () => {
    const section = generateControllerDocumentSection({});

    expect(section).toContain('<details>');
    expect(section).toContain('```json');
    expect(section).toContain('{}');
    expect(section).toContain('</details>');
  });

  test("generateControllerDocumentSection handles complex nested objects", () => {
    const complexDocument = {
      nested: {
        deeply: {
          complex: ["array", "of", "values"],
          number: 42,
          boolean: true
        }
      }
    };

    const section = generateControllerDocumentSection(complexDocument);

    expect(section).toContain('<details>');
    expect(section).toContain('"deeply"');
    expect(section).toContain('"array"');
    expect(section).toContain('"of"');
    expect(section).toContain('"values"');
    expect(section).toContain('42');
    expect(section).toContain('true');
  });

  test("generateGeoJSONSection handles malformed geographic data gracefully", () => {
    const malformedDocument = {
      type: "FeatureCollection",
      features: "not-an-array" // Invalid
    };

    const section = generateGeoJSONSection(malformedDocument);

    expect(section).toContain('<details>');
    expect(section).toContain('📍 View Geographic Analysis');
    expect(section).toContain('</details>');
    // Should not crash, should handle error gracefully
  });
});