#!/usr/bin/env bun

import { parseArgs } from "util";
import { key, controller, credential, presentation, resolver } from "./index";
import { createControllerBuilder } from "./controller/builder";
import type { VerifiableCredential } from "./credential/credential";
import type { VerifiablePresentation } from "./presentation/presentation";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import * as yaml from "js-yaml";
import { detectCredentialGeoJSON, detectControllerGeoJSON } from "./geojson/detector";
import { geoJSONToMarkdown } from "./geojson/markdown";
import { generateInvestigationReport, validateControllerDocument, type EntityReportOptions } from "./reports/entity-report";

function printHelp() {
  console.log(`
Verifiable Supply Chain CLI

Usage: bun cli.ts <command> [options]

Commands:
  init-case-study --name <case-name>            Initialize a new case study with configuration files
  generate-keys --out <file>                    Generate key pair and save to file
  generate-controller --config <file> --out <file>   Generate controller from config file
  sign-credential --entity-configuration <file> --credential <file> --out <file>   Sign credential with entity configuration
  sign-presentation --entity-configuration <file> --presentation <file> --out <file> Sign presentation with entity configuration
  verify-credential --credential <file> --controller <file>    Verify credential with controller document
  verify-credential --credential <file> --resolver-cache <file>   Verify credential with resolver cache
  verify-presentation --presentation <file> --controller <file>    Verify presentation with controller document
  verify-presentation --presentation <file> --resolver-cache <file> Verify presentation with resolver cache
  create-resolver-cache --controllers <dir> --out <file>          Create resolver cache from controller documents
  extract-holder-id --credential <file> --resolver-cache <file>   Extract holder ID from credential cnf.kid field
  extract-public-key --key <file> --out <file>           Extract public key from private key
  validate-schema --schema <file> [--example <file>]      Validate YAML schema and optional example
  validate-controller --controller <file> --schema <file> Validate controller document
  analyze-controller --controller <file> --schema <file> Analyze controller document with validation and GeoJSON
  help                                          Show this help message

Examples:
  bun cli.ts init-case-study --name my-case-study
  bun cli.ts generate-keys --out entity1-keys.json
  bun cli.ts generate-controller --config entity1-config.json --out entity1-controller.json
  bun cli.ts sign-credential --entity-configuration entity1-config.json --credential shipment.json --out signed-shipment.json
  bun cli.ts verify-credential --credential signed-shipment.json --controller entity1-controller.json
  bun cli.ts verify-credential --credential signed-shipment.json --resolver-cache resolver-cache.json
  bun cli.ts create-resolver-cache --controllers controllers/ --out resolver-cache.json
  bun cli.ts validate-schema --schema schema.yaml --example example.json
  bun cli.ts validate-controller --controller controller.json --schema schema.yaml
`);
}

async function initCaseStudy(caseName: string) {
  console.log(`Initializing case study: ${caseName}...`);

  if (caseName !== "transhrimpment") {
    console.error(`❌ Only "transhrimpment" case study is currently supported.`);
    process.exit(1);
  }

  const baseDir = `case-studies/${caseName}`;
  const entityConfigDir = `${baseDir}/entity_configurations`;
  const schemasDir = `${baseDir}/schemas`;

  // Create directory structure
  await Bun.$`mkdir -p ${entityConfigDir}`;
  await Bun.$`mkdir -p ${schemasDir}`;

  // Generate fresh keys for all entities
  const entities = [
    'chompchomp', 'camaron-corriente', 'legit-shrimp',
    'shady-carrier', 'shady-distributor', 'cargo-line', 'anonymous-distributor'
  ];

  const entityKeys = {};
  for (const entity of entities) {
    entityKeys[entity] = {
      assertion: await key.generatePrivateKey("ES256"),
      authentication: await key.generatePrivateKey("ES256")
    };
  }

  // Read existing configurations to preserve all non-key data
  const existingConfigs = {};
  for (const entity of entities) {
    const filename = `${entity}-config.json`;
    const filepath = `${entityConfigDir}/${filename}`;
    try {
      const file = Bun.file(filepath);
      if (await file.exists()) {
        const config = await file.json();
        existingConfigs[entity] = config;
      }
    } catch (error) {
      // File doesn't exist or is invalid, will use template
    }
  }

  // Create entity configurations, preserving existing data and only updating keys
  const entityConfigs = [];

  for (const entity of entities) {
    const filename = `${entity}-config.json`;
    let configData;

    // Use existing config and only replace keys
    configData = { ...existingConfigs[entity] };
    configData.assertion = [entityKeys[entity].assertion];
    configData.authentication = [entityKeys[entity].authentication];

    entityConfigs.push({
      filename,
      data: configData
    });
  }

  // Write entity configuration files
  for (const config of entityConfigs) {
    await Bun.write(`${entityConfigDir}/${config.filename}`, JSON.stringify(config.data, null, 2));
  }

  // Schema files for transhrimpment case study - all 4 schemas mentioned in README
  const schemas = [
    {
      filename: "purchase-order-credential.yaml",
      content: `title: Simple Purchase Order Credential Schema (Example)
description: Minimal example schema for verifiable credentials representing purchase orders
type: object
required:
  - "@context"
  - type
  - issuer
  - validFrom
  - credentialSubject
properties:
  "@context":
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "https://www.w3.org/ns/credentials/v2"
        - "https://geojson.org/geojson-ld/geojson-context.jsonld"
  type:
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "VerifiableCredential"
        - "PurchaseOrderCredential"
  issuer:
    type: string
    format: uri
  validFrom:
    type: string
    format: date-time
  validUntil:
    type: string
    format: date-time
  credentialSubject:
    type: object
    required:
      - id
      - type
      - features
    properties:
      id:
        type: string
        format: uri
      type:
        const: "FeatureCollection"
      features:
        type: array
        minItems: 1
        items:
          type: object
          required:
            - type
            - geometry
            - properties
          properties:
            type:
              const: "Feature"
            geometry:
              $ref: "#/$defs/GeoJSONPoint"
            properties:
              type: object
              required:
                - type
                - orderNumber
                - buyer
                - seller
                - description
                - quantity
              properties:
                type:
                  const: "PurchaseOrder"
                orderNumber:
                  type: string
                buyer:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: string
                      format: uri
                    name:
                      type: string
                seller:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: string
                      format: uri
                    name:
                      type: string
                description:
                  type: string
                quantity:
                  type: string
                deliveryDate:
                  type: string
                  format: date

examples:
  - "@context":
      - "https://www.w3.org/ns/credentials/v2"
      - "https://geojson.org/geojson-ld/geojson-context.jsonld"
    type:
      - "VerifiableCredential"
      - "PurchaseOrderCredential"
    issuer: "https://chompchomp.example/entity/bvi-001"
    validFrom: "2024-01-15T10:00:00Z"
    validUntil: "2024-03-15T10:00:00Z"
    credentialSubject:
      id: "https://orders.example/po-2024-001"
      type: "FeatureCollection"
      features:
        - type: "Feature"
          geometry:
            type: "Point"
            coordinates: [-64.6208, 18.4167]
          properties:
            type: "PurchaseOrder"
            orderNumber: "PO-2024-001"
            buyer:
              id: "https://chompchomp.example/entity/bvi-001"
              name: "Chompchomp Ltd"
            seller:
              id: "https://camaron-corriente.example/entity/ve-pbc-001"
              name: "Camarón Corriente S.A."
            description: "1000kg frozen shrimp"
            quantity: "1000kg"
            deliveryDate: "2024-02-15"

$defs:
  GeoJSONPoint:
    type: object
    required:
      - type
      - coordinates
    properties:
      type:
        const: "Point"
      coordinates:
        type: array
        minItems: 2
        maxItems: 3
        items:
          type: number`
    },
    {
      filename: "commercial-invoice-credential.yaml",
      content: `title: Simple Commercial Invoice Credential Schema (Example)
description: Minimal example schema for verifiable credentials representing commercial invoices
type: object
required:
  - "@context"
  - type
  - issuer
  - validFrom
  - credentialSubject
properties:
  "@context":
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "https://www.w3.org/ns/credentials/v2"
        - "https://geojson.org/geojson-ld/geojson-context.jsonld"
  type:
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "VerifiableCredential"
        - "CommercialInvoiceCredential"
  issuer:
    type: string
    format: uri
  validFrom:
    type: string
    format: date-time
  validUntil:
    type: string
    format: date-time
  credentialSubject:
    type: object
    required:
      - id
      - type
      - features
    properties:
      id:
        type: string
        format: uri
      type:
        const: "FeatureCollection"
      features:
        type: array
        minItems: 1
        items:
          type: object
          required:
            - type
            - geometry
            - properties
          properties:
            type:
              const: "Feature"
            geometry:
              $ref: "#/$defs/GeoJSONPoint"
            properties:
              type: object
              required:
                - type
                - invoiceNumber
                - seller
                - buyer
                - items
                - totalAmount
              properties:
                type:
                  const: "CommercialInvoice"
                invoiceNumber:
                  type: string
                seller:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: string
                      format: uri
                    name:
                      type: string
                buyer:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: string
                      format: uri
                    name:
                      type: string
                items:
                  type: array
                  items:
                    type: object
                totalAmount:
                  type: number

examples:
  - "@context":
      - "https://www.w3.org/ns/credentials/v2"
      - "https://geojson.org/geojson-ld/geojson-context.jsonld"
    type:
      - "VerifiableCredential"
      - "CommercialInvoiceCredential"
    issuer: "https://camaron-corriente.example/entity/ve-pbc-001"
    validFrom: "2024-01-20T10:00:00Z"
    credentialSubject:
      id: "https://invoices.example/inv-2024-001"
      type: "FeatureCollection"
      features:
        - type: "Feature"
          geometry:
            type: "Point"
            coordinates: [-68.0125, 10.4647]
          properties:
            type: "CommercialInvoice"
            invoiceNumber: "INV-2024-001"
            seller:
              id: "https://camaron-corriente.example/entity/ve-pbc-001"
              name: "Camarón Corriente S.A."
            buyer:
              id: "https://chompchomp.example/entity/bvi-001"
              name: "Chompchomp Ltd"
            items:
              - description: "Frozen Shrimp"
                quantity: "1000kg"
                price: 12.50
            totalAmount: 12500

$defs:
  GeoJSONPoint:
    type: object
    required:
      - type
      - coordinates
    properties:
      type:
        const: "Point"
      coordinates:
        type: array
        minItems: 2
        maxItems: 3
        items:
          type: number`
    },
    {
      filename: "certificate-of-origin-credential.yaml",
      content: `title: Simple Certificate of Origin Credential Schema (Example)
description: Minimal example schema for verifiable credentials representing certificates of origin
type: object
required:
  - "@context"
  - type
  - issuer
  - validFrom
  - credentialSubject
properties:
  "@context":
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "https://www.w3.org/ns/credentials/v2"
        - "https://geojson.org/geojson-ld/geojson-context.jsonld"
  type:
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "VerifiableCredential"
        - "CertificateOfOriginCredential"
  issuer:
    type: string
    format: uri
  validFrom:
    type: string
    format: date-time
  validUntil:
    type: string
    format: date-time
  credentialSubject:
    type: object
    required:
      - id
      - type
      - features
    properties:
      id:
        type: string
        format: uri
      type:
        const: "FeatureCollection"
      features:
        type: array
        minItems: 1
        items:
          type: object
          required:
            - type
            - geometry
            - properties
          properties:
            type:
              const: "Feature"
            geometry:
              $ref: "#/$defs/GeoJSONPoint"
            properties:
              type: object
              required:
                - type
                - certificateNumber
                - origin
                - product
                - quantity
              properties:
                type:
                  const: "CertificateOfOrigin"
                certificateNumber:
                  type: string
                origin:
                  type: object
                  required:
                    - country
                    - facility
                  properties:
                    country:
                      type: string
                    facility:
                      type: string
                product:
                  type: string
                quantity:
                  type: string
                issueDate:
                  type: string
                  format: date

examples:
  - "@context":
      - "https://www.w3.org/ns/credentials/v2"
      - "https://geojson.org/geojson-ld/geojson-context.jsonld"
    type:
      - "VerifiableCredential"
      - "CertificateOfOriginCredential"
    issuer: "https://legit-shrimp.example/entity/tt-pos-001"
    validFrom: "2024-01-10T10:00:00Z"
    credentialSubject:
      id: "https://certificates.example/coo-2024-001"
      type: "FeatureCollection"
      features:
        - type: "Feature"
          geometry:
            type: "Point"
            coordinates: [-61.5167, 10.6596]
          properties:
            type: "CertificateOfOrigin"
            certificateNumber: "COO-2024-001"
            origin:
              country: "Trinidad and Tobago"
              facility: "Legit Shrimp Ltd Port Facility"
            product: "Frozen Shrimp"
            quantity: "1000kg"
            issueDate: "2024-01-10"

$defs:
  GeoJSONPoint:
    type: object
    required:
      - type
      - coordinates
    properties:
      type:
        const: "Point"
      coordinates:
        type: array
        minItems: 2
        maxItems: 3
        items:
          type: number`
    },
    {
      filename: "bill-of-lading-credential.yaml",
      content: `title: Simple Bill of Lading Credential Schema (Example)
description: Minimal example schema for verifiable credentials representing bills of lading
type: object
required:
  - "@context"
  - type
  - issuer
  - validFrom
  - credentialSubject
properties:
  "@context":
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "https://www.w3.org/ns/credentials/v2"
        - "https://geojson.org/geojson-ld/geojson-context.jsonld"
  type:
    type: array
    items:
      type: string
    minItems: 2
    contains:
      enum:
        - "VerifiableCredential"
        - "BillOfLadingCredential"
  issuer:
    type: string
    format: uri
  validFrom:
    type: string
    format: date-time
  validUntil:
    type: string
    format: date-time
  credentialSubject:
    type: object
    required:
      - id
      - type
      - features
    properties:
      id:
        type: string
        format: uri
      type:
        const: "FeatureCollection"
      features:
        type: array
        minItems: 1
        items:
          type: object
          required:
            - type
            - geometry
            - properties
          properties:
            type:
              const: "Feature"
            geometry:
              oneOf:
                - $ref: "#/$defs/GeoJSONPoint"
                - $ref: "#/$defs/GeoJSONLineString"
            properties:
              type: object
              required:
                - type
                - billNumber
                - shipper
                - consignee
                - cargo
                - route
              properties:
                type:
                  const: "BillOfLading"
                billNumber:
                  type: string
                shipper:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: string
                      format: uri
                    name:
                      type: string
                consignee:
                  type: object
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: string
                      format: uri
                    name:
                      type: string
                cargo:
                  type: object
                  required:
                    - description
                    - quantity
                  properties:
                    description:
                      type: string
                    quantity:
                      type: string
                route:
                  type: object
                  required:
                    - origin
                    - destination
                  properties:
                    origin:
                      type: string
                    destination:
                      type: string

examples:
  - "@context":
      - "https://www.w3.org/ns/credentials/v2"
      - "https://geojson.org/geojson-ld/geojson-context.jsonld"
    type:
      - "VerifiableCredential"
      - "BillOfLadingCredential"
    issuer: "https://shady-carrier.example/entity/aw-oru-001"
    validFrom: "2024-01-25T10:00:00Z"
    credentialSubject:
      id: "https://shipments.example/bol-2024-001"
      type: "FeatureCollection"
      features:
        - type: "Feature"
          geometry:
            type: "LineString"
            coordinates: [[-68.0125, 10.4647], [-70.0270, 12.5186], [-64.6208, 18.4167]]
          properties:
            type: "BillOfLading"
            billNumber: "BOL-2024-001"
            shipper:
              id: "https://camaron-corriente.example/entity/ve-pbc-001"
              name: "Camarón Corriente S.A."
            consignee:
              id: "https://chompchomp.example/entity/bvi-001"
              name: "Chompchomp Ltd"
            cargo:
              description: "Frozen Shrimp"
              quantity: "800kg"
            route:
              origin: "Puerto Cabello, Venezuela"
              destination: "Road Town, Tortola, BVI"

$defs:
  GeoJSONPoint:
    type: object
    required:
      - type
      - coordinates
    properties:
      type:
        const: "Point"
      coordinates:
        type: array
        minItems: 2
        maxItems: 3
        items:
          type: number
  GeoJSONLineString:
    type: object
    required:
      - type
      - coordinates
    properties:
      type:
        const: "LineString"
      coordinates:
        type: array
        minItems: 2
        items:
          type: array
          minItems: 2
          maxItems: 3
          items:
            type: number`
    }
  ];

  // Write schema files
  for (const schema of schemas) {
    await Bun.write(`${schemasDir}/${schema.filename}`, schema.content);
  }

  console.log(`✅ Case study "${caseName}" initialized successfully!`);
  console.log(`📁 Created directories:`);
  console.log(`   - ${entityConfigDir}/`);
  console.log(`   - ${schemasDir}/`);
  console.log(`📄 Created entity configurations:`);
  for (const config of entityConfigs) {
    console.log(`   - ${entityConfigDir}/${config.filename}`);
  }
  console.log(`📄 Created schema files:`);
  for (const schema of schemas) {
    console.log(`   - ${schemasDir}/${schema.filename}`);
  }
  console.log(`🔑 Fresh assertion and authentication keys generated for all entities`);
}

async function generateKeys(outputFile: string) {
  console.log(`Generating key pair and saving to ${outputFile}...`);

  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const keyData = {
    privateKey,
    publicKey,
    generated: new Date().toISOString()
  };

  await Bun.write(outputFile, JSON.stringify(keyData, null, 2));
  console.log(`✅ Key pair saved to ${outputFile}`);
}

async function generateController(configFile: string, outputFile: string) {
  console.log(`Generating controller from config ${configFile} and saving to ${outputFile}...`);

  try {
    const configData = await Bun.file(configFile).json();

    const builder = createControllerBuilder()
      .id(configData.id);

    // Add alsoKnownAs if specified
    if (configData.alsoKnownAs && Array.isArray(configData.alsoKnownAs)) {
      builder.alsoKnownAs(...configData.alsoKnownAs);
    }

    // Add contexts if specified
    if (configData.contexts) {
      configData.contexts.forEach((ctx: string) => builder.context(ctx));
    }

    // Add assertion keys if specified
    if (configData.assertion && Array.isArray(configData.assertion)) {
      for (const privateKeyData of configData.assertion) {
        const publicKey = await key.exportPublicKey(privateKeyData);
        // Use entity ID + key thumbprint for key ID
        const keyId = `${configData.id}#${privateKeyData.kid}`;
        builder.addAssertionKey(publicKey, keyId);
      }
    }

    // Add authentication keys if specified
    if (configData.authentication && Array.isArray(configData.authentication)) {
      for (const privateKeyData of configData.authentication) {
        const publicKey = await key.exportPublicKey(privateKeyData);
        // Use entity ID + key thumbprint for key ID
        const keyId = `${configData.id}#${privateKeyData.kid}`;
        builder.addAuthenticationKey(publicKey, keyId);
      }
    }

    // Add geographic features - expect proper GeoJSON FeatureCollection format
    if (configData.type === "FeatureCollection" && configData.features) {
      for (const feature of configData.features) {
        if (feature.type === "Feature") {
          builder.addFeature(feature.geometry, feature.properties || {});
        } else {
          console.warn(`Skipping invalid feature - missing type "Feature": ${JSON.stringify(feature)}`);
        }
      }
    }

    const controllerDoc = builder.build();

    await Bun.write(outputFile, JSON.stringify(controllerDoc, null, 2));
    console.log(`✅ Controller saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error reading config file: ${error}`);
    process.exit(1);
  }
}

async function signCredential(keyFile: string, credentialFile: string, outputFile: string) {
  console.log(`Signing credential ${credentialFile} with key ${keyFile} and saving to ${outputFile}...`);

  try {
    const keyData = await Bun.file(keyFile).json();
    const unsignedCredential = await Bun.file(credentialFile).json();

    // Check for GeoJSON content before signing
    const geoJSONAnalysis = detectCredentialGeoJSON(unsignedCredential);
    if (geoJSONAnalysis) {
      console.log(`🗺️ Geographic data detected in credential: ${geoJSONAnalysis.description}`);

    }

    // CREDENTIAL ISSUANCE: Use ASSERTION key for signing credentials
    let privateKey;
    if (keyData.privateKey) {
      privateKey = keyData.privateKey;
    } else if (keyData.assertion && Array.isArray(keyData.assertion) && keyData.assertion.length > 0) {
      privateKey = keyData.assertion[0]; // ASSERTION key for credential issuance
      console.log(`🔐 Using assertion key for credential issuance`);
    } else if (keyData.authentication && Array.isArray(keyData.authentication) && keyData.authentication.length > 0) {
      privateKey = keyData.authentication[0]; // Fall back to auth key if no assertion key
    } else {
      privateKey = keyData; // Fall back to direct key format
    }
    const signer = await credential.signer(privateKey);
    const signedCredentialJWT = await signer.sign(unsignedCredential);

    // Wrap JWT in EnvelopedVerifiableCredential format with vc+jwt media type
    const envelopedCredential = {
      "@context": "https://www.w3.org/ns/credentials/v2",
      "id": `data:application/vc+jwt,${signedCredentialJWT}`,
      "type": "EnvelopedVerifiableCredential"
    };

    await Bun.write(outputFile, JSON.stringify(envelopedCredential, null, 2));
    console.log(`✅ Signed credential saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error signing credential: ${error}`);
    process.exit(1);
  }
}

async function signPresentation(entityConfigFile: string, presentationFile: string, outputFile: string) {
  console.log(`Signing presentation ${presentationFile} with entity configuration ${entityConfigFile} and saving to ${outputFile}...`);

  try {
    const keyData = await Bun.file(entityConfigFile).json();
    const unsignedPresentation = await Bun.file(presentationFile).json();

    // PRESENTATION SIGNING: Use AUTHENTICATION key for signing presentations
    let privateKey;
    if (keyData.privateKey) {
      privateKey = keyData.privateKey;
    } else if (keyData.authentication && Array.isArray(keyData.authentication) && keyData.authentication.length > 0) {
      privateKey = keyData.authentication[0]; // AUTHENTICATION key for presentation signing
      console.log(`🔐 Using authentication key for presentation signing`);
    } else if (keyData.assertion && Array.isArray(keyData.assertion) && keyData.assertion.length > 0) {
      privateKey = keyData.assertion[0]; // Fall back to assertion key if no auth key
    } else {
      privateKey = keyData; // Fall back to direct key format
    }
    const signer = await presentation.signer(privateKey);
    const signedPresentationJWT = await signer.sign(unsignedPresentation);

    // Wrap JWT in EnvelopedVerifiablePresentation format with vp+jwt media type
    const envelopedPresentation = {
      "@context": "https://www.w3.org/ns/credentials/v2",
      "id": `data:application/vp+jwt,${signedPresentationJWT}`,
      "type": "EnvelopedVerifiablePresentation"
    };

    await Bun.write(outputFile, JSON.stringify(envelopedPresentation, null, 2));
    console.log(`✅ Signed presentation saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error signing presentation: ${error}`);
    process.exit(1);
  }
}

async function verifyCredential(credentialFile: string, resolverCacheFile: string) {

  try {
    const credentialData = await Bun.file(credentialFile).json();

    // Handle EnvelopedVerifiableCredential format
    let signedCredential;
    if (credentialData.type === "EnvelopedVerifiableCredential" && credentialData.id) {
      // Extract JWT from data URL
      const dataUrlPrefix = "data:application/vc+jwt,";
      if (credentialData.id.startsWith(dataUrlPrefix)) {
        signedCredential = credentialData.id.substring(dataUrlPrefix.length);
      } else {
        throw new Error("Invalid EnvelopedVerifiableCredential format");
      }
    } else {
      // Fall back to raw JWT string format
      signedCredential = typeof credentialData === 'string' ? credentialData : JSON.stringify(credentialData);
    }

    // Decode JWT to get issuer and find controller in cache
    const jwt = signedCredential;
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Decode payload to get issuer
    const payloadB64 = parts[1];
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);
    const issuerUri = payload.iss;

    if (!issuerUri) {
      throw new Error("No issuer found in credential");
    }

    // Load resolver cache and find controller
    const resolverCache = await Bun.file(resolverCacheFile).json();
    const controllerData = resolverCache[issuerUri];

    if (!controllerData) {
      throw new Error(`Controller not found in cache for issuer: ${issuerUri}`);
    }

    // Extract public key from controller document
    // For credential verification, we need the assertion method (used for signing credentials)
    let publicKey;
    if (controllerData.verificationMethod && controllerData.assertionMethod && controllerData.assertionMethod.length > 0) {
      // Find the assertion method verification key
      const assertionMethodId = controllerData.assertionMethod[0];
      const verificationMethod = controllerData.verificationMethod.find((vm: any) => vm.id === assertionMethodId);
      if (verificationMethod && verificationMethod.publicKeyJwk) {
        publicKey = verificationMethod.publicKeyJwk;
      } else {
        throw new Error("Could not find assertion method public key in controller document");
      }
    } else {
      throw new Error("Controller document must have verificationMethod and assertionMethod");
    }
    const verifier = await credential.verifier(publicKey);
    const result = await verifier.verify(signedCredential);

    console.log(`✅ Credential verification successful`);
    console.log(JSON.stringify(result, null, 2));

    // Check for GeoJSON content in credential subject
    const geoJSONAnalysis = detectCredentialGeoJSON(result);
    if (geoJSONAnalysis) {
      console.log(`\n🗺️ Geographic data detected in credential:`);

      // Generate markdown preview
      const markdownPreview = geoJSONToMarkdown(
        result.credentialSubject,
        geoJSONAnalysis,
        { title: "Credential Geographic Data" }
      );


      console.log(`\n${markdownPreview}`);
    }

  } catch (error) {
    console.error(`❌ Credential verification failed: ${error}`);
    process.exit(1);
  }
}

async function verifyPresentation(presentationFile: string, resolverCacheFile: string) {

  try {
    const presentationData = await Bun.file(presentationFile).json();

    // Handle EnvelopedVerifiablePresentation format
    let signedPresentation;
    if (presentationData.type === "EnvelopedVerifiablePresentation" && presentationData.id) {
      // Extract JWT from data URL
      const dataUrlPrefix = "data:application/vp+jwt,";
      if (presentationData.id.startsWith(dataUrlPrefix)) {
        signedPresentation = presentationData.id.substring(dataUrlPrefix.length);
      } else {
        throw new Error("Invalid EnvelopedVerifiablePresentation format");
      }
    } else {
      // Fall back to raw JWT string format
      signedPresentation = typeof presentationData === 'string' ? presentationData : JSON.stringify(presentationData);
    }

    // Create generic resolver and load all controllers from cache
    const genericResolver = resolver.createGenericResolver();
    const resolverCache = await Bun.file(resolverCacheFile).json();
    for (const [controllerId, controllerData] of Object.entries(resolverCache)) {
      genericResolver.addController(controllerId, controllerData);
    }

    const verifier = await presentation.verifierWithGenericResolver(genericResolver);
    const result = await verifier.verify(signedPresentation);

    console.log(`✅ Presentation verification successful`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`❌ Presentation verification failed: ${error}`);
    process.exit(1);
  }
}

async function extractPublicKey(keyFile: string, outputFile: string) {
  console.log(`Extracting public key from ${keyFile} and saving to ${outputFile}...`);

  try {
    const keyData = await Bun.file(keyFile).json();
    // Support multiple key formats
    let privateKey;
    if (keyData.privateKey) {
      privateKey = keyData.privateKey;
    } else if (keyData.assertion && Array.isArray(keyData.assertion) && keyData.assertion.length > 0) {
      privateKey = keyData.assertion[0]; // Use first assertion key for signing
    } else if (keyData.authentication && Array.isArray(keyData.authentication) && keyData.authentication.length > 0) {
      privateKey = keyData.authentication[0]; // Use first auth key for signing
    } else {
      privateKey = keyData; // Fall back to direct key format
    }
    const publicKey = await key.exportPublicKey(privateKey);

    await Bun.write(outputFile, JSON.stringify(publicKey, null, 2));
    console.log(`✅ Public key saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error extracting public key: ${error}`);
    process.exit(1);
  }
}

async function validateSchema(schemaFile: string, exampleFile?: string) {
  console.log(`Validating schema ${schemaFile}${exampleFile ? ` with example ${exampleFile}` : ''}...`);

  try {
    // Read and parse YAML schema
    const schemaContent = await Bun.file(schemaFile).text();
    let schemaData: any;

    try {
      schemaData = yaml.load(schemaContent);
      console.log(`✅ YAML schema is valid`);
    } catch (yamlError) {
      console.error(`❌ Invalid YAML schema: ${yamlError}`);
      process.exit(1);
    }

    // Convert to JSON Schema and validate
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);

    let validate: any;
    try {
      validate = ajv.compile(schemaData);
      console.log(`✅ JSON Schema compilation successful`);
    } catch (schemaError) {
      console.error(`❌ Invalid JSON Schema: ${schemaError}`);
      process.exit(1);
    }

    // Validate built-in examples if present
    if (schemaData.examples && Array.isArray(schemaData.examples)) {
      console.log(`\n=== Validating built-in examples ===`);
      for (let i = 0; i < schemaData.examples.length; i++) {
        const example = schemaData.examples[i];
        const isValid = validate(example);

        if (isValid) {
          console.log(`✅ Built-in example ${i + 1} is valid`);
        } else {
          console.error(`❌ Built-in example ${i + 1} is invalid:`);
          console.error(JSON.stringify(validate.errors, null, 2));
          process.exit(1);
        }
      }
    }

    // Validate external example file if provided
    if (exampleFile) {
      console.log(`\n=== Validating external example ===`);
      const exampleData = await Bun.file(exampleFile).json();
      const isValid = validate(exampleData);

      if (isValid) {
        console.log(`✅ External example is valid`);
      } else {
        console.error(`❌ External example is invalid:`);
        console.error(JSON.stringify(validate.errors, null, 2));
        process.exit(1);
      }
    }

    console.log(`\n✅ Schema validation completed successfully`);

  } catch (error) {
    console.error(`❌ Error during validation: ${error}`);
    process.exit(1);
  }
}

function containsPrivateKeys(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Check for private key indicators in JWK format
  if (obj.d || obj.p || obj.q || obj.dp || obj.dq || obj.qi) {
    return true;
  }

  // Check for private key indicators in PEM format
  if (typeof obj === 'string' && (
    obj.includes('-----BEGIN PRIVATE KEY-----') ||
    obj.includes('-----BEGIN RSA PRIVATE KEY-----') ||
    obj.includes('-----BEGIN EC PRIVATE KEY-----') ||
    obj.includes('privateKey') ||
    obj.includes('private_key')
  )) {
    return true;
  }

  // Check for common private key property names
  const privateKeyProperties = ['privateKey', 'private_key', 'secretKey', 'secret_key', 'd', 'assertion', 'authentication'];
  for (const prop of privateKeyProperties) {
    if (obj.hasOwnProperty(prop)) {
      // Special handling for assertion/authentication arrays - these should only contain key references, not keys themselves
      if ((prop === 'assertion' || prop === 'authentication') && Array.isArray(obj[prop])) {
        for (const item of obj[prop]) {
          if (typeof item === 'object' && item !== null && containsPrivateKeys(item)) {
            return true;
          }
        }
      } else if (obj[prop] && typeof obj[prop] === 'object') {
        if (containsPrivateKeys(obj[prop])) {
          return true;
        }
      }
    }
  }

  // Recursively check nested objects and arrays
  for (const value of Object.values(obj)) {
    if (containsPrivateKeys(value)) {
      return true;
    }
  }

  return false;
}

async function validateController(controllerFile: string, schemaFile: string) {
  console.log(`Validating controller document ${controllerFile}...`);

  try {
    // Read controller document
    const controllerData = await Bun.file(controllerFile).json();

    // Security check: Reject controllers containing private keys
    if (containsPrivateKeys(controllerData)) {
      console.error(`❌ SECURITY VIOLATION: Controller document contains private keys!`);
      console.error(`Controller documents should only contain public information.`);
      console.error(`Private keys must be stored securely in entity configurations.`);
      process.exit(1);
    }
    console.log(`✅ Security check passed - no private keys detected`);

    // Load and validate against controller schema
    const schemaContent = await Bun.file(schemaFile).text();
    const schemaData = yaml.load(schemaContent);

    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);

    const validate = ajv.compile(schemaData);
    const isValid = validate(controllerData);

    if (isValid) {
      console.log(`✅ Controller document structure is valid`);

      // Additional validation checks
      const controller = controllerData.controller;
      if (controller) {
        // Check that all verification method controllers match the document ID
        for (const method of controller.verificationMethod || []) {
          if (method.controller !== controller.id) {
            console.error(`❌ Verification method controller mismatch: ${method.id}`);
            console.error(`Expected: ${controller.id}, Got: ${method.controller}`);
            process.exit(1);
          }
        }
        console.log(`✅ Verification method controller references are valid`);

        // Check that assertion/authentication method references exist in verificationMethod
        const vmIds = new Set((controller.verificationMethod || []).map((vm: any) => vm.id));

        for (const assertionId of controller.assertionMethod || []) {
          if (!vmIds.has(assertionId)) {
            console.error(`❌ Assertion method references non-existent verification method: ${assertionId}`);
            process.exit(1);
          }
        }

        for (const authId of controller.authentication || []) {
          if (!vmIds.has(authId)) {
            console.error(`❌ Authentication method references non-existent verification method: ${authId}`);
            process.exit(1);
          }
        }
        console.log(`✅ Method references are valid`);
      }

      console.log(`\n✅ Controller document validation completed successfully`);

      // Check for GeoJSON content in controller document
      const geoJSONAnalysis = detectControllerGeoJSON(controllerData);
      if (geoJSONAnalysis) {
        console.log(`\n🗺️ Geographic data detected in controller:`);

        // Generate markdown preview
        const controllerGeoData = controllerData.controller || controllerData;
        const markdownPreview = geoJSONToMarkdown(
          controllerGeoData,
          geoJSONAnalysis,
          { title: "Entity Geographic Information" }
        );


        console.log(`\n${markdownPreview}`);
      }

    } else {
      console.error(`❌ Controller document is invalid:`);
      console.error(JSON.stringify(validate.errors, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error validating controller: ${error}`);
    process.exit(1);
  }
}

async function analyzeController(controllerFile: string, schemaFile: string) {
  try {
    const controllerData = await Bun.file(controllerFile).json();

    // Validate controller first
    const validationResult = await validateControllerDocument(controllerData, schemaFile);

    // Generate entity report using the new TypeScript module
    const entityReport = await import('./reports/entity-report');
    const report = entityReport.generateEntityReport({
      entityName: "Entity Analysis",
      controllerDocument: controllerData,
      validationResult: validationResult
    });

    console.log(report);
  } catch (error) {
    console.error(`❌ Error analyzing controller: ${error}`);
  }
}

async function createResolverCache(controllersDir: string, outputFile: string) {
  console.log(`Creating resolver cache from controllers in ${controllersDir} and saving to ${outputFile}...`);

  try {
    // Read all controller files from the directory
    const controllerFiles = await Bun.$`find ${controllersDir} -name "*.json" -type f`.text();
    const files = controllerFiles.trim().split('\n').filter(f => f);

    if (files.length === 0) {
      console.error(`❌ No JSON files found in ${controllersDir}`);
      process.exit(1);
    }

    const resolverCache = {};

    for (const file of files) {
      try {
        console.log(`📄 Processing ${file}...`);
        const controllerData = await Bun.file(file).json();

        // Extract the controller ID
        let controllerId;
        if (controllerData.id) {
          controllerId = controllerData.id;
        } else if (controllerData.controller && controllerData.controller.id) {
          controllerId = controllerData.controller.id;
        } else {
          console.warn(`⚠️  Skipping ${file} - no controller ID found`);
          continue;
        }

        // Add to cache
        resolverCache[controllerId] = controllerData;
        console.log(`✅ Added controller ${controllerId} to cache`);
      } catch (error) {
        console.error(`❌ Error processing ${file}: ${error}`);
        process.exit(1);
      }
    }

    // Save resolver cache
    await Bun.write(outputFile, JSON.stringify(resolverCache, null, 2));
    console.log(`✅ Resolver cache saved to ${outputFile} with ${Object.keys(resolverCache).length} controllers`);

    // Print summary
    console.log(`\n📋 Resolver Cache Summary:`);
    for (const [id, controller] of Object.entries(resolverCache)) {
      console.log(`   - ${id}`);
    }

  } catch (error) {
    console.error(`❌ Error creating resolver cache: ${error}`);
    process.exit(1);
  }
}

async function extractHolderId(credentialFile: string, resolverCacheFile: string) {
  try {
    // Load credential and resolver cache
    const credentialData = await Bun.file(credentialFile).json();
    const resolverCache = await Bun.file(resolverCacheFile).json();

    // Handle EnvelopedVerifiableCredential format
    let signedCredential;
    if (credentialData.type === "EnvelopedVerifiableCredential" && credentialData.id) {
      // Extract JWT from data URL
      const dataUrlPrefix = "data:application/vc+jwt,";
      if (credentialData.id.startsWith(dataUrlPrefix)) {
        signedCredential = credentialData.id.substring(dataUrlPrefix.length);
      } else {
        throw new Error("Invalid EnvelopedVerifiableCredential format");
      }
    } else {
      throw new Error("Expected EnvelopedVerifiableCredential format");
    }

    // Decode JWT to get the cnf.kid
    const parts = signedCredential.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Decode payload to get cnf.kid
    const payloadB64 = parts[1];
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);

    if (!payload.cnf || !payload.cnf.kid) {
      throw new Error("No cnf.kid found in credential - cannot determine holder");
    }

    const confKid = payload.cnf.kid;

    // Search all controllers in the cache for a key that matches this kid
    for (const [controllerId, controllerData] of Object.entries(resolverCache)) {
      const controller = controllerData as any;

      // Check verification methods for matching kid
      if (controller.verificationMethod) {
        for (const vm of controller.verificationMethod) {
          if (vm.publicKeyJwk && vm.publicKeyJwk.kid === confKid) {
            // Found the controller that has this key - return controller ID without fragment
            const holderIdWithoutFragment = controllerId.split('#')[0];
            console.log(holderIdWithoutFragment);
            return;
          }
        }
      }
    }

    throw new Error(`No controller found in cache with key ID: ${confKid}`);

  } catch (error) {
    console.error(`❌ Error extracting holder ID: ${error}`);
    process.exit(1);
  }
}


// Parse command line arguments
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    name: { type: 'string' },
    out: { type: 'string' },
    config: { type: 'string' },
    key: { type: 'string' },
    'entity-configuration': { type: 'string' },
    cred: { type: 'string' },
    credential: { type: 'string' },
    pres: { type: 'string' },
    presentation: { type: 'string' },
    resolver: { type: 'string' },
    'resolver-cache': { type: 'string' },
    controllers: { type: 'string' },
    schema: { type: 'string' },
    example: { type: 'string' },
    controller: { type: 'string' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
});

const [command] = positionals;

if (values.help || command === 'help') {
  printHelp();
  process.exit(0);
}

// Execute commands
try {
  switch (command) {
    case 'init-case-study':
      if (!values.name) {
        console.error("Please specify --name <case-name>.");
        process.exit(1);
      }
      await initCaseStudy(values.name);
      break;

    case 'generate-keys':
      if (!values.out) {
        console.error("Please specify --out <file> to save the generated keys.");
        process.exit(1);
      }
      await generateKeys(values.out);
      break;

    case 'generate-controller':
      if (!values.config || !values.out) {
        console.error("Please specify --config <file> and --out <file>.");
        process.exit(1);
      }
      await generateController(values.config, values.out);
      break;

    case 'sign-credential':
      if (!values['entity-configuration'] || !values.credential || !values.out) {
        console.error("Please specify --entity-configuration <file>, --credential <file>, and --out <file>.");
        process.exit(1);
      }
      await signCredential(values['entity-configuration'], values.credential, values.out);
      break;

    case 'sign-presentation':
      if (!values['entity-configuration'] || !values.presentation || !values.out) {
        console.error("Please specify --entity-configuration <file>, --presentation <file>, and --out <file>.");
        process.exit(1);
      }
      await signPresentation(values['entity-configuration'], values.presentation, values.out);
      break;

    case 'verify-credential':
      if (!values.credential || !values['resolver-cache']) {
        console.error("Please specify --credential <file> and --resolver-cache <file>.");
        process.exit(1);
      }
      await verifyCredential(values.credential, values['resolver-cache']);
      break;

    case 'verify-presentation':
      if (!values.presentation || !values['resolver-cache']) {
        console.error("Please specify --presentation <file> and --resolver-cache <file>.");
        process.exit(1);
      }
      await verifyPresentation(values.presentation, values['resolver-cache']);
      break;

    case 'create-resolver-cache':
      if (!values.controllers || !values.out) {
        console.error("Please specify --controllers <directory> and --out <file>.");
        process.exit(1);
      }
      await createResolverCache(values.controllers, values.out);
      break;

    case 'extract-holder-id':
      if (!values.credential || !values['resolver-cache']) {
        console.error("Please specify --credential <file> and --resolver-cache <file>.");
        process.exit(1);
      }
      await extractHolderId(values.credential, values['resolver-cache']);
      break;

    case 'extract-public-key':
      if (!values.key || !values.out) {
        console.error("Please specify --key <file> and --out <file>.");
        process.exit(1);
      }
      await extractPublicKey(values.key, values.out);
      break;

    case 'validate-schema':
      if (!values.schema) {
        console.error("Please specify --schema <file>.");
        process.exit(1);
      }
      await validateSchema(values.schema, values.example);
      break;

    case 'validate-controller':
      if (!values.controller) {
        console.error("Please specify --controller <file>.");
        process.exit(1);
      }
      if (!values.schema) {
        console.error("Please specify --schema <file>.");
        process.exit(1);
      }
      await validateController(values.controller, values.schema);
      break;

    case 'analyze-controller':
      if (!values.controller) {
        console.error("Please specify --controller <file>.");
        process.exit(1);
      }
      if (!values.schema) {
        console.error("Please specify --schema <file>.");
        process.exit(1);
      }
      await analyzeController(values.controller, values.schema);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error}`);
  process.exit(1);
}