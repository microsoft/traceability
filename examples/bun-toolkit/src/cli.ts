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
import { geoJSONToMarkdown, generateMapPreviewURL } from "./geojson/markdown";

function printHelp() {
  console.log(`
Verifiable Supply Chain CLI

Usage: bun cli.ts <command> [options]

Commands:
  init-case-study --name <case-name>            Initialize a new case study with configuration files
  generate-keys --out <file>                    Generate key pair and save to file
  generate-controller --config <file> --out <file>   Generate controller from config file
  sign-credential --key <file> --cred <file> --out <file>   Sign credential with private key
  sign-presentation --key <file> --pres <file> --out <file> Sign presentation with private key
  verify-credential --cred <file> --key <file>           Verify credential with public key
  verify-presentation --pres <file> --resolver <file>    Verify presentation with resolver
  extract-public-key --key <file> --out <file>           Extract public key from private key
  validate-schema --schema <file> [--example <file>]      Validate YAML schema and optional example
  validate-controller --controller <file> --schema <file> Validate controller document
  analyze-geojson --credential <file> [--out <file>]     Analyze GeoJSON in credential and export markdown
  analyze-geojson --controller <file> [--out <file>]    Analyze GeoJSON in controller and export markdown
  help                                          Show this help message

Examples:
  bun cli.ts init-case-study --name my-case-study
  bun cli.ts generate-keys --out entity1-keys.json
  bun cli.ts generate-controller --config entity1-config.json --out entity1-controller.json
  bun cli.ts sign-credential --key entity1-keys.json --cred shipment.json --out signed-shipment.json
  bun cli.ts verify-credential --cred signed-shipment.json --key entity1-public.json
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

      // Generate map preview URL if possible
      const mapURL = generateMapPreviewURL(geoJSONAnalysis);
      if (mapURL) {
        console.log(`📍 Map Preview: ${mapURL}`);
      }
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
    const signedCredential = await signer.sign(unsignedCredential);

    await Bun.write(outputFile, JSON.stringify(signedCredential, null, 2));
    console.log(`✅ Signed credential saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error signing credential: ${error}`);
    process.exit(1);
  }
}

async function signPresentation(keyFile: string, presentationFile: string, outputFile: string) {
  console.log(`Signing presentation ${presentationFile} with key ${keyFile} and saving to ${outputFile}...`);

  try {
    const keyData = await Bun.file(keyFile).json();
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
    const signedPresentation = await signer.sign(unsignedPresentation);

    await Bun.write(outputFile, JSON.stringify(signedPresentation, null, 2));
    console.log(`✅ Signed presentation saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error signing presentation: ${error}`);
    process.exit(1);
  }
}

async function verifyCredential(credentialFile: string, keyFile: string) {
  console.log(`Verifying credential ${credentialFile} with key ${keyFile}...`);

  try {
    const signedCredential = await Bun.file(credentialFile).text();
    const keyData = await Bun.file(keyFile).json();

    // Support multiple key formats
    let publicKey;
    if (keyData.publicKey) {
      publicKey = keyData.publicKey;
    } else if (keyData.assertion && Array.isArray(keyData.assertion) && keyData.assertion.length > 0) {
      publicKey = await key.exportPublicKey(keyData.assertion[0]); // Export public from first assertion key
    } else if (keyData.authentication && Array.isArray(keyData.authentication) && keyData.authentication.length > 0) {
      publicKey = await key.exportPublicKey(keyData.authentication[0]); // Export public from first auth key
    } else {
      publicKey = keyData; // Fall back to direct key format
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

      // Generate map preview URL if possible
      const mapURL = generateMapPreviewURL(geoJSONAnalysis);
      if (mapURL) {
        console.log(`📍 Map Preview: ${mapURL}`);
      }

      console.log(`\n${markdownPreview}`);
    }

  } catch (error) {
    console.error(`❌ Credential verification failed: ${error}`);
    process.exit(1);
  }
}

async function verifyPresentation(presentationFile: string, resolverFile: string) {
  console.log(`Verifying presentation ${presentationFile} with resolver ${resolverFile}...`);

  try {
    const signedPresentation = await Bun.file(presentationFile).text();
    const resolverData = await Bun.file(resolverFile).json();

    // Create a simple resolver from the resolver data
    const simpleResolver = {
      resolve: async (id: string) => {
        return resolverData[id] || null;
      }
    };

    const verifier = await presentation.verifierWithGenericResolver(simpleResolver);
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

        // Generate map preview URL if possible
        const mapURL = generateMapPreviewURL(geoJSONAnalysis);
        if (mapURL) {
          console.log(`📍 Map Preview: ${mapURL}`);
        }

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

async function analyzeGeoJSON(inputFile: string, outputFile?: string, isController: boolean = false) {
  const docType = isController ? 'controller' : 'credential';
  console.log(`Analyzing GeoJSON in ${docType} ${inputFile}...`);

  try {
    const documentData = await Bun.file(inputFile).json();

    // Detect GeoJSON content based on document type
    let geoJSONAnalysis: any;
    let geoData: any;
    let title: string;

    if (isController) {
      geoJSONAnalysis = detectControllerGeoJSON(documentData);
      geoData = documentData.controller || documentData;
      title = "Entity Geographic Information";
    } else {
      geoJSONAnalysis = detectCredentialGeoJSON(documentData);
      geoData = documentData.credentialSubject;
      title = "Supply Chain Geographic Data";
    }

    if (!geoJSONAnalysis) {
      console.log(`❌ No valid GeoJSON found in ${docType} ${isController ? 'document' : 'subject'}`);
      return;
    }

    console.log(`✅ GeoJSON detected: ${geoJSONAnalysis.description}`);

    // Generate markdown output
    const markdownContent = geoJSONToMarkdown(
      geoData,
      geoJSONAnalysis,
      {
        title,
        showAnalysis: true,
        showCoordinates: true,
        showProperties: true,
        maxPropertiesDisplay: 10
      }
    );

    // Generate map preview URL if possible
    const mapURL = generateMapPreviewURL(geoJSONAnalysis);
    if (mapURL) {
      console.log(`📍 Map Preview: ${mapURL}`);
    }

    // Output to file or console
    if (outputFile) {
      await Bun.write(outputFile, markdownContent);
      console.log(`✅ GeoJSON analysis saved to ${outputFile}`);
    } else {
      console.log(`\n${markdownContent}`);
    }

  } catch (error) {
    console.error(`❌ Error analyzing GeoJSON: ${error}`);
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
    cred: { type: 'string' },
    credential: { type: 'string' },
    pres: { type: 'string' },
    resolver: { type: 'string' },
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
      if (!values.key || !values.cred || !values.out) {
        console.error("Please specify --key <file>, --cred <file>, and --out <file>.");
        process.exit(1);
      }
      await signCredential(values.key, values.cred, values.out);
      break;

    case 'sign-presentation':
      if (!values.key || !values.pres || !values.out) {
        console.error("Please specify --key <file>, --pres <file>, and --out <file>.");
        process.exit(1);
      }
      await signPresentation(values.key, values.pres, values.out);
      break;

    case 'verify-credential':
      if (!values.cred || !values.key) {
        console.error("Please specify --cred <file> and --key <file>.");
        process.exit(1);
      }
      await verifyCredential(values.cred, values.key);
      break;

    case 'verify-presentation':
      if (!values.pres || !values.resolver) {
        console.error("Please specify --pres <file> and --resolver <file>.");
        process.exit(1);
      }
      await verifyPresentation(values.pres, values.resolver);
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

    case 'analyze-geojson':
      const credFile = values.cred || values.credential;
      if (credFile) {
        await analyzeGeoJSON(credFile, values.out, false);
      } else if (values.controller) {
        await analyzeGeoJSON(values.controller, values.out, true);
      } else {
        console.error("Please specify either --credential <file> or --controller <file>.");
        process.exit(1);
      }
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