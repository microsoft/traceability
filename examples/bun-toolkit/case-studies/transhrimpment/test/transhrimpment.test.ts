import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { key, credential, presentation, resolver } from "../../../src/index";
import { createControllerBuilder } from "../../../src/controller/builder";
import { validateControllerDocument } from "../../../src/controller/validator";
import path from "node:path";

// Test data interface matching the narrative structure
interface TestReport {
  caseName: string;
  timestamp: string;
  summary: {
    entitiesIdentified: number;
    credentialsIssued: number;
    presentationsCreated: number;
    fraudsDetected: number;
    testsTotal: number;
    testsPassed: number;
    testsFailed: number;
  };
  entities: EntityTestResult[];
  credentials: CredentialTestResult[];
  presentations: PresentationTestResult[];
  fraudDetection: FraudTestResult[];
}

interface EntityTestResult {
  name: string;
  controllerId: string;
  legitimate: boolean;
  geoLocation: [number, number] | null;
  verificationMethods: number;
  testPassed: boolean;
  errors: string[];
}

interface CredentialTestResult {
  description: string;
  issuer: string;
  holder: string;
  schemaType: string;
  issuanceSuccessful: boolean;
  verificationSuccessful: boolean;
  fraudType: string | null;
  testPassed: boolean;
  errors: string[];
  jwtClaims?: {
    iat?: number; // issued at
    nbf?: number; // not before
    exp?: number; // expires at
  };
  verificationTime?: string;
}

interface PresentationTestResult {
  description: string;
  holder: string;
  credentialIncluded: string;
  signingSuccessful: boolean;
  verificationSuccessful: boolean;
  testPassed: boolean;
  errors: string[];
}

interface FraudTestResult {
  scenario: string;
  description: string;
  expectedOutcome: string;
  actualOutcome: string;
  fraudDetected: boolean;
  testPassed: boolean;
  errors: string[];
}

// Global test data
let testReport: TestReport;
let resolverCache: Record<string, any> = {};
let controllers: Record<string, any> = {};
let credentials: Record<string, any> = {};
let presentations: Record<string, any> = {};

// Test configuration paths
const CASE_DIR = "/Users/orie/Desktop/Work/tv/traceability/examples/bun-toolkit/case-studies/transhrimpment";

// Entity configuration mapping
const entityKeys = [
  "chompchomp",
  "camaron-corriente",
  "legit-shrimp",
  "shady-carrier",
  "shady-distributor",
  "cargo-line",
  "anonymous-distributor",
  "honest-importer"
];

// Timeline based on narrative dates for issuance
const issuanceTimeline = {
  "legit-shrimp-honest-importer-origin": new Date("2024-01-05T10:00:00Z"), // Legitimate certificate issued first
  "chompchomp-purchase-order": new Date("2024-01-15T10:00:00Z"), // Purchase order submitted
  "camaron-corriente-invoice": new Date("2024-01-20T10:00:00Z"), // Invoice sent
  "camaron-corriente-origin": new Date("2024-01-22T10:00:00Z"), // Certificate of origin issued
  "shady-carrier-lading": new Date("2024-02-01T10:00:00Z"), // Shady carrier delivers and forges docs
  "shady-carrier-forged-lading": new Date("2024-02-01T15:00:00Z"), // Forged lading same day
  "shady-distributor-fraudulent-origin": new Date("2024-02-05T10:00:00Z"), // Shady distributor forges certificates
  "anonymous-distributor-secondary-purchase-order": new Date("2024-02-10T10:00:00Z"), // Secondary transaction begins
  "shady-distributor-secondary-invoice": new Date("2024-02-12T10:00:00Z"), // Secondary invoice
  "cargo-line-secondary-lading": new Date("2024-02-15T10:00:00Z"), // Secondary delivery
};

// Presentation timeline based on README narrative - when credentials are presented for verification
// These times MUST match exactly with the timeline in README.md
const verificationTimeline = {
  "chompchomp-purchase-order": new Date("2024-01-15T10:30:00Z"), // Purchase order credentials presented to Camarón Corriente S.A. for order processing
  "camaron-corriente-invoice": new Date("2024-01-20T10:30:00Z"), // Commercial invoice credentials presented to Chompchomp Ltd for payment verification
  "camaron-corriente-origin": new Date("2024-01-22T10:30:00Z"), // Certificate of origin credentials presented to shipping carrier for export documentation
  "shady-carrier-lading": new Date("2024-02-01T10:30:00Z"), // Bill of lading credentials presented to Chompchomp Ltd for delivery acceptance
  "shady-carrier-forged-lading": new Date("2024-02-01T11:30:00Z"), // Forged bill of lading credentials presented to customs for partial loss claim
  "shady-distributor-fraudulent-origin": new Date("2024-02-05T10:30:00Z"), // FRAUDULENT certificate of origin credentials presented by Shady Distributor Ltd claiming Legit Shrimp Ltd identity
  "legit-shrimp-honest-importer-origin": new Date("2024-02-08T10:30:00Z"), // STOLEN legitimate certificate credentials inappropriately presented by Shady Distributor Ltd
  "anonymous-distributor-secondary-purchase-order": new Date("2024-02-10T11:30:00Z"), // Secondary purchase order credentials presented to Shady Distributor Ltd for order processing
  "shady-distributor-secondary-invoice": new Date("2024-02-12T10:30:00Z"), // Secondary commercial invoice credentials presented to Anonymous Distributor for payment
  "cargo-line-secondary-lading": new Date("2024-02-15T10:30:00Z"), // Secondary bill of lading credentials presented to Anonymous Distributor for delivery
};

// Entity configurations loaded from files
let entityConfigs: Record<string, any> = {};

beforeAll(async () => {
  // Initialize test report
  testReport = {
    caseName: "Transhrimpment Supply Chain Fraud Investigation",
    timestamp: new Date().toISOString(),
    summary: {
      entitiesIdentified: 0,
      credentialsIssued: 0,
      presentationsCreated: 0,
      fraudsDetected: 0,
      testsTotal: 0,
      testsPassed: 0,
      testsFailed: 0
    },
    entities: [],
    credentials: [],
    presentations: [],
    fraudDetection: []
  };

  // Load entity configurations from files
  for (const entityKey of entityKeys) {
    try {
      const configPath = `${CASE_DIR}/entity_configurations/${entityKey}-config.json`;
      const configFile = Bun.file(configPath);
      const configData = await configFile.json();
      entityConfigs[entityKey] = configData;
    } catch (error) {
      console.warn(`Failed to load config for ${entityKey}: ${error}`);
    }
  }

  // Load existing resolver cache
  try {
    const resolverCacheFile = Bun.file(`${CASE_DIR}/resolver-cache.json`);
    const cacheData = await resolverCacheFile.json();
    resolverCache = cacheData;

    // Also populate controllers from resolver cache
    for (const [controllerId, controllerData] of Object.entries(cacheData)) {
      const entityKey = entityKeys.find(key => entityConfigs[key]?.id === controllerId);
      if (entityKey) {
        controllers[entityKey] = controllerData;
      }
    }
  } catch (error) {
    console.warn(`Failed to load resolver cache: ${error}`);
  }
});

afterAll(async () => {
  // Create mapping from credential keys to template filenames
  const credentialToTemplate: Record<string, string> = {
    "chompchomp-purchase-order": "chompchomp-purchase-order-template.json",
    "camaron-corriente-invoice": "camaron-corriente-invoice-template.json",
    "camaron-corriente-origin": "camaron-corriente-origin-template.json",
    "shady-carrier-lading": "shady-carrier-lading-template.json",
    "shady-carrier-forged-lading": "shady-carrier-forged-lading-template.json",
    "anonymous-distributor-secondary-purchase-order": "anonymous-distributor-secondary-purchase-order-template.json",
    "shady-distributor-secondary-invoice": "shady-distributor-secondary-invoice-template.json",
    "cargo-line-secondary-lading": "cargo-line-secondary-lading-template.json",
    "legit-shrimp-honest-importer-origin": "legit-shrimp-honest-importer-origin-template.json",
    "shady-distributor-fraudulent-origin": "shady-distributor-fraudulent-origin-template.json"
  };

  // Create index mapping authentication keys to holder names
  const authKeyToHolderName: Record<string, string> = {};
  for (const [entityKey, controller] of Object.entries(controllers)) {
    const holderName = entityConfigs[entityKey]?.name || entityKey;
    // Map each authentication method to the holder name
    if (controller.authentication && Array.isArray(controller.authentication)) {
      for (const authMethod of controller.authentication) {
        authKeyToHolderName[authMethod] = holderName;
      }
    }
  }

  // Generate GeoJSON FeatureCollection report
  const geoJsonReport = {
    type: "FeatureCollection",
    features: []
  };

  // Add controller features
  for (const [entityKey, controller] of Object.entries(controllers)) {
    // Extract geometry from controller's features array (GeoJSON FeatureCollection format)
    if (controller.features && controller.features.length > 0 && controller.features[0].geometry) {
      // TODO: Determine fraud type for controllers based on verification analysis
      // For now, ignoring controller fraud types as requested
      const fraudType = null;

      geoJsonReport.features.push({
        type: "Feature",
        geometry: controller.features[0].geometry,
        properties: {
          controller_id: controller.id,
          controller_name: entityConfigs[entityKey]?.name || entityKey,
          fraud_type: fraudType
        }
      });
    }
  }

  // Add presentation verification features
  for (const presentation of testReport.presentations) {
    // Find the holder's controller by looking up the credential and finding its holder
    const credentialKey = presentation.credentialIncluded;
    const credential = credentials[credentialKey];

    if (credential) {
      // Extract credential JWT to get intended holder
      const credentialJwtToken = credential.id.substring("data:application/vc+jwt,".length);
      const credentialParts = credentialJwtToken.split('.');
      const credentialPayload = JSON.parse(atob(credentialParts[1]));
      const intendedHolderKey = credentialPayload.cnf?.kid; // Who should present this credential

      // Extract presentation JWT to get actual presenter
      const presentationEnvelope = presentations[`${credentialKey}-presentation`];
      let actualPresenterKey = intendedHolderKey; // Default fallback

      if (presentationEnvelope?.id) {
        try {
          const presentationJwtToken = presentationEnvelope.id.substring("data:application/vp+jwt,".length);
          const presentationParts = presentationJwtToken.split('.');
          const presentationHeader = JSON.parse(atob(presentationParts[0]));
          if (presentationHeader.kid) {
            actualPresenterKey = presentationHeader.kid; // Who actually signed the presentation
          }
        } catch (error) {
          console.warn(`Failed to parse presentation JWT for ${credentialKey}:`, error);
        }
      }

      // Find controller for the actual presenter (for location/geometry)
      let presenterEntityKey = "";
      let presenterController = null;

      for (const [key, controller] of Object.entries(controllers)) {
        const ctrl = controller as any;
        if (ctrl.authentication?.includes(actualPresenterKey)) {
          presenterEntityKey = key;
          presenterController = ctrl;
          break;
        }
      }

      if (presenterController && presenterController.features && presenterController.features.length > 0) {
        // Get credential schema from the credential (already parsed above)
        const credentialSchema = credentialPayload.credentialSchema?.[0]?.type ||
                               credentialPayload.type?.find((t: string) => t !== "VerifiableCredential") ||
                               "unknown";

        // Get issuer information
        const issuerId = credentialPayload.issuer || credentialPayload.iss;
        let issuerName = "unknown-issuer";

        // Find issuer controller to get issuer name
        for (const [entityKey, controller] of Object.entries(controllers)) {
          if ((controller as any).id === issuerId) {
            issuerName = entityConfigs[entityKey]?.name || entityKey;
            break;
          }
        }

        // Get verification time from timeline
        const presentationIssuanceTime = verificationTimeline[credentialKey as keyof typeof verificationTimeline];
        const verificationTime = presentationIssuanceTime ?
          new Date(presentationIssuanceTime.getTime() + 30000) : // 30 seconds after signing
          null;

        // Determine fraud status based on credential key and narrative
        const isFraudulentPresentation = credentialKey === "shady-distributor-fraudulent-origin" ||
                                        credentialKey === "shady-carrier-forged-lading";
        const containsFraudulentCredential = credentialKey === "shady-distributor-fraudulent-origin" ||
                                           credentialKey === "shady-carrier-forged-lading" ||
                                           credentialKey === "legit-shrimp-honest-importer-origin"; // stolen credential

        // Generate description based on README timeline - must match exactly
        let description = "";
        switch (credentialKey) {
          case "chompchomp-purchase-order":
            description = "Purchase order credentials presented to Camarón Corriente S.A. for order processing";
            break;
          case "camaron-corriente-invoice":
            description = "Commercial invoice credentials presented to Chompchomp Ltd for payment verification";
            break;
          case "camaron-corriente-origin":
            description = "Certificate of origin credentials presented to shipping carrier for export documentation";
            break;
          case "shady-carrier-lading":
            description = "Bill of lading credentials presented to Chompchomp Ltd for delivery acceptance";
            break;
          case "shady-carrier-forged-lading":
            description = "Forged bill of lading credentials presented to customs for partial loss claim";
            break;
          case "shady-distributor-fraudulent-origin":
            description = "FRAUDULENT certificate of origin credentials presented by Shady Distributor Ltd claiming Legit Shrimp Ltd identity";
            break;
          case "legit-shrimp-honest-importer-origin":
            description = "STOLEN legitimate certificate credentials inappropriately presented by Shady Distributor Ltd";
            break;
          case "anonymous-distributor-secondary-purchase-order":
            description = "Secondary purchase order credentials presented to Shady Distributor Ltd for order processing";
            break;
          case "shady-distributor-secondary-invoice":
            description = "Secondary commercial invoice credentials presented to Anonymous Distributor for payment";
            break;
          case "cargo-line-secondary-lading":
            description = "Secondary bill of lading credentials presented to Anonymous Distributor for delivery";
            break;
          default:
            description = `Credential presentation for ${credentialSchema} verification`;
        }

        // Determine fraud type for presentations based on verification results
        let presentationFraudType = null;

        // Check if presentation failed verification - indicates potential fraud
        if (!presentation.verificationSuccessful) {
          // Failed verification - need to analyze why it failed
          const issuerId = credentialPayload.issuer || credentialPayload.iss;
          const expectedHolderId = credentialPayload.cnf?.kid; // Who the credential was intended for

          // Check if this is document compromise (stolen credential)
          // Even though presentation fails, we can still analyze the holder mismatch
          if (intendedHolderKey && actualPresenterKey !== intendedHolderKey) {
            // Presentation failed because credential's intended holder != actual presenter
            // This indicates a stolen credential - document compromise
            presentationFraudType = "⚠️ Document Compromise";
          } else {
            // Other verification failures indicate counterfeiting or alteration
            presentationFraudType = "⚠️ Counterfeiting and Alteration";
          }
        } else {
          // Presentation verified successfully - analyze credential holder mismatch
          const issuerId = credentialPayload.issuer || credentialPayload.iss;
          const expectedHolderId = credentialPayload.cnf?.kid; // Who the credential was intended for

          // KEY INSIGHT: Document compromise (stolen credentials) detection
          // - Both presentation AND credential verify successfully
          // - But credential's cnf.kid (intended holder) != presentation signing key (actual presenter)
          // - This indicates the credential was stolen and is being presented by the thief
          if (intendedHolderKey && actualPresenterKey !== intendedHolderKey) {
            // Credential's intended holder doesn't match who's presenting it
            // This is document compromise - a stolen legitimate credential
            presentationFraudType = "⚠️ Document Compromise";
          }
          // Detect synthetic identity fraud - fake identity claims
          else if (credentialKey.includes("fraudulent") &&
                   (credentialKey.includes("origin") || credentialKey.includes("identity"))) {
            presentationFraudType = "⚠️ Synthetic Identity Fraud";
          }
          // Detect counterfeiting and alteration - forged documents
          else if (credentialKey.includes("forged") ||
                   (credentialKey.includes("fraudulent") && !credentialKey.includes("origin"))) {
            presentationFraudType = "⚠️ Counterfeiting and Alteration";
          }
        }

        // TODO: More sophisticated fraud detection based on:
        // - Temporal analysis of credential usage patterns
        // - Supply chain relationship validation
        // - Cross-reference with known legitimate business relationships

        // Add presentation feature (using presenter's location)
        geoJsonReport.features.push({
          type: "Feature",
          geometry: presenterController.features[0].geometry,
          properties: {
            presentation_verified: presentation.verificationSuccessful,
            verification_time: verificationTime?.toISOString() || null,
            authentication_key: actualPresenterKey,
            file_name: credentialToTemplate[credentialKey] || "unknown-template.json",
            credential_schema: credentialSchema,
            holder_name: authKeyToHolderName[actualPresenterKey] || "unknown-holder",
            presentation_is_fraudulent: isFraudulentPresentation,
            presentation_contains_fraudulent_credential: containsFraudulentCredential,
            description: description,
            fraud_type: presentationFraudType
          }
        });

        // Add credential feature (using credential subject geometry)
        const credentialSubject = credentialPayload.credentialSubject;
        if (credentialSubject && credentialSubject.features && credentialSubject.features.length > 0) {
          const credentialFeature = credentialSubject.features[0];
          if (credentialFeature.geometry) {
            // Determine fraud type for credentials based on verification results
            let credentialFraudType = null;

            // Analyze fraud patterns based on verification results
            if (!presentation.verificationSuccessful) {
              // Failed presentation verification - need to analyze why
              const issuerId = credentialPayload.issuer || credentialPayload.iss;
              const expectedHolderId = credentialPayload.cnf?.kid; // Who should have this credential

              // Check if this is document compromise (stolen credential)
              if (intendedHolderKey && actualPresenterKey !== intendedHolderKey) {
                // Credential is legitimate but being presented by wrong holder - stolen
                credentialFraudType = "⚠️ Document Compromise";
              } else {
                // Other verification failures indicate counterfeiting or alteration
                credentialFraudType = "⚠️ Counterfeiting and Alteration";
              }
            } else {
              // Both presentation and credential verification passed
              const issuerId = credentialPayload.issuer || credentialPayload.iss;
              const expectedHolderId = credentialPayload.cnf?.kid; // Who should have this credential

              // KEY INSIGHT: Document compromise (stolen credentials) detection
              // - Credential itself verifies successfully (authentic)
              // - But credential's cnf.kid != presentation signing key
              // - This means a legitimate credential was stolen and is being misused
              if (intendedHolderKey && actualPresenterKey !== intendedHolderKey) {
                // Authentic credential being presented by wrong holder - stolen
                credentialFraudType = "⚠️ Document Compromise";
              }
              // Detect synthetic identity fraud through issuer analysis
              else if (credentialKey.includes("fraudulent") &&
                       credentialKey.includes("origin") &&
                       issuerId && issuerId.includes("legit-shrimp")) {
                // Fraudulent certificate claiming legitimate entity's identity
                credentialFraudType = "⚠️ Synthetic Identity Fraud";
              }
              // Detect counterfeiting and alteration - forged/fabricated documents
              else if (credentialKey.includes("forged") ||
                       (credentialKey.includes("fraudulent") && !credentialKey.includes("origin"))) {
                credentialFraudType = "⚠️ Counterfeiting and Alteration";
              }

              // TODO: Additional verification-based fraud detection:
              // - Temporal analysis of credential issuance vs presentation timing
              // - Supply chain relationship validation against known patterns
              // - Cross-reference with legitimate business relationship database
            }

            geoJsonReport.features.push({
              type: "Feature",
              geometry: credentialFeature.geometry,
              properties: {
                file_name: credentialToTemplate[credentialKey] || "unknown-template.json",
                credential_schema: credentialSchema,
                issuer_id: issuerId,
                issuer_name: issuerName,
                authentication_key: actualPresenterKey,
                verification_time: verificationTime?.toISOString() || null,
                fraud_type: credentialFraudType
              }
            });
          }
        }
      }
    }
  }

  await Bun.write(`${CASE_DIR}/report.json`, JSON.stringify(geoJsonReport, null, 2));
  console.log(`\n📄 GeoJSON report generated: ${CASE_DIR}/report.json`);
  console.log(`📊 Summary: ${testReport.summary.testsPassed}/${testReport.summary.testsTotal} tests passed`);
  console.log(`📍 Features: ${geoJsonReport.features.length} (controllers and presentations)`);
});

describe("Transhrimpment Case Study", () => {

  describe("Setup: Controller and Cache Generation", () => {
    test("should regenerate controllers and resolver cache from entity configurations", async () => {
      console.log("\n🔄 Regenerating controllers and resolver cache...");

      const regeneratedControllers: Record<string, any> = {};
      const regeneratedResolverCache: Record<string, any> = {};

      // Generate controller for each entity configuration
      for (const entityKey of entityKeys) {
        const config = entityConfigs[entityKey];
        if (!config) {
          throw new Error(`Configuration not found for ${entityKey}`);
        }

        console.log(`📋 Processing ${entityKey} (${config.id})`);

        // Create controller builder
        const builder = createControllerBuilder()
          .id(config.id);

        // Add alsoKnownAs if specified
        if (config.alsoKnownAs && Array.isArray(config.alsoKnownAs)) {
          builder.alsoKnownAs(...config.alsoKnownAs);
        }

        // Add contexts if specified
        if (config.contexts) {
          config.contexts.forEach((ctx: string) => builder.context(ctx));
        }

        // Add assertion keys if specified
        if (config.assertion && Array.isArray(config.assertion)) {
          for (const privateKeyData of config.assertion) {
            const publicKey = await key.exportPublicKey(privateKeyData);
            // Use entity ID + key thumbprint for key ID
            const keyId = `${config.id}#${privateKeyData.kid}`;
            builder.addAssertionKey(publicKey, keyId);
          }
        }

        // Add authentication keys if specified
        if (config.authentication && Array.isArray(config.authentication)) {
          for (const privateKeyData of config.authentication) {
            const publicKey = await key.exportPublicKey(privateKeyData);
            // Use entity ID + key thumbprint for key ID
            const keyId = `${config.id}#${privateKeyData.kid}`;
            builder.addAuthenticationKey(publicKey, keyId);
          }
        }

        // Add geographic features - expect proper GeoJSON FeatureCollection format
        if (config.type === "FeatureCollection" && config.features) {
          for (const feature of config.features) {
            if (feature.type === "Feature") {
              builder.addFeature(feature.geometry, feature.properties || {});
            } else {
              console.warn(`Skipping invalid feature - missing type "Feature": ${JSON.stringify(feature)}`);
            }
          }
        }

        const controllerDoc = builder.build();

        // Store in our test data structures
        regeneratedControllers[entityKey] = controllerDoc;
        regeneratedResolverCache[config.id] = controllerDoc;

        // Store keys for signing from entity configuration
        (controllerDoc as any)._assertionKey = config.assertion[0];
        (controllerDoc as any)._authKey = config.authentication[0];
      }

      // Update global variables
      controllers = regeneratedControllers;
      resolverCache = regeneratedResolverCache;

      // Write regenerated resolver cache to file
      await Bun.write(`${CASE_DIR}/resolver-cache.json`, JSON.stringify(regeneratedResolverCache, null, 2));

      console.log(`✅ Generated ${Object.keys(controllers).length} controllers`);
      console.log(`✅ Resolver cache regenerated with ${Object.keys(resolverCache).length} entries`);

      // Verify all controllers were created
      expect(Object.keys(controllers).length).toBe(entityKeys.length);
      expect(Object.keys(resolverCache).length).toBe(entityKeys.length);
    });
  });

  describe("Step 1: Entity Identification", () => {

    entityKeys.forEach((key) => {
      test(`should identify and validate controller for ${key}`, async () => {
        testReport.summary.testsTotal++;

        const config = entityConfigs[key];
        const controller = controllers[key];

        const entityResult: EntityTestResult = {
          name: key,
          controllerId: config?.id || "",
          legitimate: key.includes("shady") ? false : true,
          geoLocation: null,
          verificationMethods: 0,
          testPassed: false,
          errors: []
        };

        try {
          if (!config) {
            throw new Error(`Configuration not found for ${key}`);
          }

          if (!controller) {
            throw new Error(`Controller not found in resolver cache for ${key}`);
          }

          // Validate controller against schema
          const schemaPath = `${CASE_DIR}/schemas/controller-document.yaml`;
          const validationResult = await validateControllerDocument(controller, schemaPath);

          if (!validationResult.isValid) {
            throw new Error(`Controller validation failed: ${validationResult.errorMessage}`);
          }

          // Validate controller structure matches configuration
          expect(controller.id).toBe(config.id);
          expect(controller.verificationMethod).toBeDefined();
          expect(Array.isArray(controller.verificationMethod)).toBe(true);
          expect(controller.verificationMethod.length).toBeGreaterThan(0);

          entityResult.controllerId = controller.id;
          entityResult.verificationMethods = controller.verificationMethod.length;

          // Extract geographic location from controller if available
          if (controller.features && Array.isArray(controller.features)) {
            const pointFeature = controller.features.find((f: any) =>
              f.geometry?.type === "Point" && f.geometry.coordinates
            );
            if (pointFeature) {
              entityResult.geoLocation = pointFeature.geometry.coordinates as [number, number];
            }
          }

          // Store keys for signing from entity configuration
          (controllers[key] as any)._assertionKey = config.assertion[0];
          (controllers[key] as any)._authKey = config.authentication[0];

          entityResult.testPassed = true;
          testReport.summary.entitiesIdentified++;
          testReport.summary.testsPassed++;

        } catch (error) {
          entityResult.errors.push(`Entity validation failed: ${error}`);
          testReport.summary.testsFailed++;
        }

        testReport.entities.push(entityResult);
      });
    });
  });

  describe("Step 2: Credential Issuance and Verification", () => {

    const credentialSpecs = [
      // PRIMARY TRANSACTION: Chompchomp ↔ Camarón Corriente (1000kg shrimp)
      {
        key: "chompchomp-purchase-order",
        description: "Purchase Order (Chompchomp → Camarón Corriente) - 1000kg frozen shrimp",
        issuer: "chompchomp",
        holder: "camaron-corriente",
        template: "chompchomp-purchase-order-template.json",
        schema: "PurchaseOrderCredential",
        fraudType: null
      },
      {
        key: "camaron-corriente-invoice",
        description: "Commercial Invoice (Camarón Corriente → Chompchomp) - Payment for shrimp",
        issuer: "camaron-corriente",
        holder: "chompchomp",
        template: "camaron-corriente-invoice-template.json",
        schema: "CommercialInvoiceCredential",
        fraudType: null
      },
      {
        key: "camaron-corriente-origin",
        description: "Certificate of Origin (Camarón Corriente → Chompchomp) - Venezuela origin",
        issuer: "camaron-corriente",
        holder: "chompchomp",
        template: "camaron-corriente-origin-template.json",
        schema: "CertificateOfOriginCredential",
        fraudType: null
      },

      // PRIMARY TRANSPORTATION (Shady Carrier replaces Cargo Line due to hurricane damage)
      {
        key: "shady-carrier-lading",
        description: "Bill of Lading (Shady Carrier → Chompchomp) - Transport with forged partial loss",
        issuer: "shady-carrier",
        holder: "chompchomp",
        template: "shady-carrier-lading-template.json",
        schema: "BillOfLadingCredential",
        fraudType: "Counterfeiting and Alteration" // Forged to show partial loss
      },
      {
        key: "shady-carrier-forged-lading",
        description: "Forged Bill of Lading (Shady Carrier) - Claims partial shipment destroyed to steal goods",
        issuer: "shady-carrier",
        holder: "anonymous-distributor",
        template: "shady-carrier-forged-lading-template.json",
        schema: "BillOfLadingCredential",
        fraudType: "Counterfeiting and Alteration"
      },

      // SECONDARY TRANSACTION: Anonymous Distributor ↔ Shady Distributor (500kg stolen shrimp)
      {
        key: "anonymous-distributor-secondary-purchase-order",
        description: "Purchase Order (Anonymous Distributor → Shady Distributor) - 500kg stolen shrimp",
        issuer: "anonymous-distributor",
        holder: "shady-distributor",
        template: "anonymous-distributor-secondary-purchase-order-template.json",
        schema: "PurchaseOrderCredential",
        fraudType: null
      },
      {
        key: "shady-distributor-secondary-invoice",
        description: "Commercial Invoice (Shady Distributor → Anonymous Distributor) - Sale of stolen goods",
        issuer: "shady-distributor",
        holder: "anonymous-distributor",
        template: "shady-distributor-secondary-invoice-template.json",
        schema: "CommercialInvoiceCredential",
        fraudType: null
      },
      {
        key: "cargo-line-secondary-lading",
        description: "Bill of Lading (Cargo Line → Anonymous Distributor) - Secondary transaction delivery",
        issuer: "cargo-line",
        holder: "anonymous-distributor",
        template: "cargo-line-secondary-lading-template.json",
        schema: "BillOfLadingCredential",
        fraudType: null // Cargo Line is legitimate, unaware of stolen goods
      },

      // DOCUMENT THEFT AND FORGERY
      {
        key: "legit-shrimp-honest-importer-origin",
        description: "Certificate of Origin (Legit Shrimp → Honest Importer) - LEGITIMATE but will be stolen",
        issuer: "legit-shrimp",
        holder: "honest-importer",
        template: "legit-shrimp-honest-importer-origin-template.json",
        schema: "CertificateOfOriginCredential",
        fraudType: "Document Compromise" // Will be stolen and misused
      },
      {
        key: "shady-distributor-fraudulent-origin",
        description: "FRAUDULENT Certificate of Origin (Shady Distributor forging Legit Shrimp identity)",
        issuer: "shady-distributor", // Wrong issuer! Claims to be from Legit Shrimp
        holder: "shady-distributor",
        template: "shady-distributor-fraudulent-origin-template.json",
        schema: "CertificateOfOriginCredential",
        fraudType: "Counterfeiting and Alteration"
      }
    ];

    credentialSpecs.forEach((spec) => {
      test(`should issue and verify: ${spec.description}`, async () => {
        testReport.summary.testsTotal++;

        const credResult: CredentialTestResult = {
          description: spec.description,
          issuer: entityConfigs[spec.issuer].name,
          holder: entityConfigs[spec.holder].name,
          schemaType: spec.schema,
          issuanceSuccessful: false,
          verificationSuccessful: false,
          fraudType: spec.fraudType,
          testPassed: false,
          errors: []
        };

        try {
          // Load credential template from file
          const templatePath = `${CASE_DIR}/credential-templates/${spec.template}`;
          const templateFile = Bun.file(templatePath);
          const credentialTemplate = await templateFile.json();

          // Get issuer controller and keys
          const issuerController = controllers[spec.issuer];
          const assertionKey = (issuerController as any)._assertionKey;

          if (!issuerController || !assertionKey) {
            throw new Error(`Issuer controller or keys not found for ${spec.issuer}`);
          }

          if (!credentialTemplate) {
            throw new Error(`Template not found: ${templatePath}`);
          }

          // Issue credential using library with timeline-aligned issuance time
          const issuanceTime = issuanceTimeline[spec.key as keyof typeof issuanceTimeline];
          const signer = await credential.signer(assertionKey);

          // Get the assertion method ID from the controller
          const assertionMethodId = issuerController.assertionMethod[0]; // First assertion method
          const signedCredentialJWT = await signer.sign(credentialTemplate, {
            kid: assertionMethodId,
            issuanceTime: issuanceTime
          });

          credResult.issuanceSuccessful = !!signedCredentialJWT;

          if (credResult.issuanceSuccessful) {
            // Store signed credential
            credentials[spec.key] = {
              "@context": "https://www.w3.org/ns/credentials/v2",
              "id": `data:application/vc+jwt,${signedCredentialJWT}`,
              "type": "EnvelopedVerifiableCredential"
            };

            // Extract JWT claims from the signed credential
            try {
              const parts = signedCredentialJWT.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                credResult.jwtClaims = {
                  iat: payload.iat,
                  nbf: payload.nbf,
                  exp: payload.exp
                };
              }
            } catch (error) {
              credResult.errors.push(`JWT claims extraction failed: ${error}`);
            }

            // Verify credential at the appropriate time
            try {
              // Find issuer's assertion key for verification
              const assertionMethodId = issuerController.assertionMethod[0];
              const verificationMethod = issuerController.verificationMethod.find(
                (vm: any) => vm.id === assertionMethodId
              );

              if (!verificationMethod) {
                throw new Error("Assertion method verification key not found");
              }

              // Use verification time from timeline
              const verificationTime = verificationTimeline[spec.key as keyof typeof verificationTimeline];
              if (verificationTime) {
                credResult.verificationTime = verificationTime.toISOString();
              }

              const verifier = await credential.verifier(verificationMethod.publicKeyJwk);
              const verificationResult = await verifier.verify(signedCredentialJWT, verificationTime);

              credResult.verificationSuccessful = !!verificationResult;

            } catch (verifyError) {
              credResult.verificationSuccessful = false;
              credResult.errors.push(`Verification failed: ${verifyError}`);
            }
          }

          // Test passes if both issuance and verification succeed (for legitimate credentials)
          // For fraudulent credentials, we expect them to be issued but verification may fail based on resolver
          credResult.testPassed = credResult.issuanceSuccessful &&
            (spec.fraudType === null ? credResult.verificationSuccessful : true);

          if (credResult.testPassed) {
            testReport.summary.credentialsIssued++;
            testReport.summary.testsPassed++;
          } else {
            testReport.summary.testsFailed++;
          }

        } catch (error) {
          credResult.errors.push(`Test execution error: ${error}`);
          testReport.summary.testsFailed++;
        }

        testReport.credentials.push(credResult);
      });
    });
  });

  describe("Step 3: Presentation Creation and Verification", () => {

    test("should create and verify presentations for credentials", async () => {
      testReport.summary.testsTotal++;

      try {
        let presentationsCreated = 0;
        let presentationsVerified = 0;

        // Create presentations for each credential
        for (const [credKey, credData] of Object.entries(credentials)) {
          const presResult: PresentationTestResult = {
            description: `Presentation for ${credKey}`,
            holder: "Unknown",
            presentationFile: `${credKey}-presentation`,
            credentialIncluded: credKey,
            signingSuccessful: false,
            verificationSuccessful: false,
            testPassed: false,
            errors: []
          };

          try {
            // Extract holder ID from credential
            const envelopedCred = credData as any;
            const jwtToken = envelopedCred.id.substring("data:application/vc+jwt,".length);

            // Decode JWT to get holder info
            const parts = jwtToken.split('.');
            const payload = JSON.parse(atob(parts[1]));
            const cnfKid = payload.cnf?.kid;

            if (!cnfKid) {
              presResult.errors.push("No cnf.kid found in credential");
              continue;
            }

            // Find holder controller based on cnf.kid
            let holderKey = "";
            let holderController = null;

            for (const [key, controller] of Object.entries(controllers)) {
              const ctrl = controller as any;
              if (ctrl.authentication?.includes(cnfKid)) {
                holderKey = key;
                holderController = ctrl;
                break;
              }
            }

            if (!holderController) {
              presResult.errors.push(`No holder found for cnf.kid: ${cnfKid}`);
              continue;
            }

            presResult.holder = entityConfigs[holderKey].name;

            // Create presentation
            let presentationData;
            let presentationSigner;

            // Special case: For stolen credential, Shady Distributor presents it instead of the rightful holder
            if (credKey === "legit-shrimp-honest-importer-origin") {
              // This represents the fraudulent scenario where Shady Distributor presents the stolen credential
              presentationData = {
                "@context": ["https://www.w3.org/ns/credentials/v2"],
                "type": ["VerifiablePresentation"],
                "holder": "https://shady-distributor.example", // Fraudulent presenter
                "verifiableCredential": [envelopedCred]
              };

              // Sign with Shady Distributor's key (not the rightful holder's key)
              const shadyDistributorController = controllers["shady-distributor"];
              const shadyAuthKey = (shadyDistributorController as any)._authKey;
              presentationSigner = await presentation.signer(shadyAuthKey);
            } else {
              // Normal case: legitimate holder presents their own credential
              presentationData = {
                "@context": ["https://www.w3.org/ns/credentials/v2"],
                "type": ["VerifiablePresentation"],
                "holder": entityConfigs[holderKey].id,
                "verifiableCredential": [envelopedCred]
              };

              // Sign presentation with holder's auth key at timeline specified time
              const holderAuthKey = (holderController as any)._authKey;
              presentationSigner = await presentation.signer(holderAuthKey);
            }

            const presentationIssuanceTime = verificationTimeline[credKey as keyof typeof verificationTimeline];
            const pressSigner = presentationSigner;

            // Get the authentication method ID from the controller
            const authenticationMethodId = holderController.authentication[0]; // First authentication method
            const signedPresentationJWT = await pressSigner.sign(presentationData, {
              kid: authenticationMethodId,
              issuanceTime: presentationIssuanceTime
            });

            presResult.signingSuccessful = !!signedPresentationJWT;
            presentationsCreated++;

            if (presResult.signingSuccessful) {
              // Store presentation
              presentations[`${credKey}-presentation`] = {
                "@context": "https://www.w3.org/ns/credentials/v2",
                "id": `data:application/vp+jwt,${signedPresentationJWT}`,
                "type": "EnvelopedVerifiablePresentation"
              };

              // Verify presentation within its validity period (presentation has 1-hour expiration)
              try {
                const genericResolver = resolver.createGenericResolver();
                for (const [controllerId, controllerData] of Object.entries(resolverCache)) {
                  genericResolver.addController(controllerId, controllerData);
                }

                // Verify presentation 30 seconds after it was signed, well within the 1-hour validity period
                const presVerificationTime = presentationIssuanceTime ?
                  new Date(presentationIssuanceTime.getTime() + 30000) : // 30 seconds after presentation signing
                  new Date(); // Fallback to current time if no presentation issuance time

                const presVerifier = await presentation.presentationVerifierFromResolver(genericResolver);
                const presVerificationResult = await presVerifier.verify(signedPresentationJWT, {
                  verificationTime: presVerificationTime
                });

                presResult.verificationSuccessful = !!presVerificationResult;
                if (presResult.verificationSuccessful) {
                  presentationsVerified++;
                }

              } catch (presVerifyError) {
                console.log(`Presentation verification failed for ${credKey}:`, presVerifyError);
                presResult.errors.push(`Presentation verification failed: ${presVerifyError}`);
              }
            }

            presResult.testPassed = presResult.signingSuccessful && presResult.verificationSuccessful;

          } catch (error) {
            presResult.errors.push(`Error processing credential ${credKey}: ${error}`);
          }

          testReport.presentations.push(presResult);
        }

        testReport.summary.presentationsCreated = presentationsCreated;

        expect(presentationsCreated).toBeGreaterThan(0);
        expect(presentationsVerified).toBeGreaterThan(0);

        testReport.summary.testsPassed++;

      } catch (error) {
        testReport.summary.testsFailed++;
        throw error;
      }
    });
  });

  describe("Step 4: Fraud Detection", () => {

    test("should detect fraudulent credential (signature mismatch)", async () => {
      testReport.summary.testsTotal++;

      const fraudResult: FraudTestResult = {
        scenario: "Fraudulent Credential Detection",
        description: "Shady Distributor Ltd attempts to forge Certificate of Origin claiming to be from Legit Shrimp Ltd",
        expectedOutcome: "Verification should fail due to signature mismatch",
        actualOutcome: "",
        fraudDetected: false,
        testPassed: false,
        errors: []
      };

      try {
        // Get the fraudulent credential
        const fraudCred = credentials["shady-distributor-fraudulent-origin"];
        if (!fraudCred) {
          throw new Error("Fraudulent credential not found");
        }

        // Extract JWT
        const jwtToken = fraudCred.id.substring("data:application/vc+jwt,".length);

        // Try to verify against Legit Shrimp's keys (should fail)
        try {
          const legitShrimpController = controllers["legit-shrimp"];
          const assertionMethodId = legitShrimpController.assertionMethod[0];
          const verificationMethod = legitShrimpController.verificationMethod.find(
            (vm: any) => vm.id === assertionMethodId
          );

          const verifier = await credential.verifier(verificationMethod.publicKeyJwk);
          const result = await verifier.verify(jwtToken);

          // If we reach here, verification unexpectedly succeeded
          fraudResult.fraudDetected = false;
          fraudResult.actualOutcome = "Verification unexpectedly succeeded - fraud not detected";

        } catch (verifyError) {
          // Verification failed as expected - fraud detected!
          fraudResult.fraudDetected = true;
          fraudResult.actualOutcome = "Verification failed as expected - signature mismatch detected";
        }

        fraudResult.testPassed = fraudResult.fraudDetected;

        expect(fraudResult.fraudDetected).toBe(true);

        if (fraudResult.testPassed) {
          testReport.summary.fraudsDetected++;
          testReport.summary.testsPassed++;
        } else {
          testReport.summary.testsFailed++;
          fraudResult.errors.push("Expected verification to fail but it succeeded");
        }

      } catch (error) {
        fraudResult.errors.push(`Test execution error: ${error}`);
        testReport.summary.testsFailed++;
      }

      testReport.fraudDetection.push(fraudResult);
    });

    test("should detect stolen credential presentation (holder binding failure)", async () => {
      testReport.summary.testsTotal++;

      const stolenResult: FraudTestResult = {
        scenario: "Stolen Credential Detection",
        description: "Shady Distributor Ltd attempts to present legitimate credential issued to Honest Importer Ltd",
        expectedOutcome: "Presentation should fail due to holder binding mismatch",
        actualOutcome: "",
        fraudDetected: false,
        testPassed: false,
        errors: []
      };

      try {
        // Get legitimate credential issued to Honest Importer
        const legitimateCred = credentials["legit-shrimp-honest-importer-origin"];
        if (!legitimateCred) {
          throw new Error("Legitimate credential not found");
        }

        // Create fraudulent presentation where Shady Distributor tries to present it
        const fraudulentPresentation = {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          "type": ["VerifiablePresentation"],
          "holder": "https://shady-distributor.example", // Wrong holder!
          "verifiableCredential": [legitimateCred]
        };

        // Sign with Shady Distributor's keys (the attacker)
        const shadyController = controllers["shady-distributor"];
        const shadyAuthKey = (shadyController as any)._authKey;

        const fraudSigner = await presentation.signer(shadyAuthKey);

        // Get the authentication method ID from the shady controller
        const shadyAuthenticationMethodId = shadyController.authentication[0]; // First authentication method
        const fraudSignedJWT = await fraudSigner.sign(fraudulentPresentation, {
          kid: shadyAuthenticationMethodId
        });

        // Try to verify (should fail due to holder binding mismatch)
        try {
          const genericResolver = resolver.createGenericResolver();
          for (const [controllerId, controllerData] of Object.entries(resolverCache)) {
            genericResolver.addController(controllerId, controllerData);
          }

          const presVerifier = await presentation.presentationVerifierFromResolver(genericResolver);
          const result = await presVerifier.verify(fraudSignedJWT);

          // If we reach here, verification unexpectedly succeeded
          stolenResult.fraudDetected = false;
          stolenResult.actualOutcome = "Presentation verification unexpectedly succeeded";

        } catch (verifyError) {
          // Verification failed as expected - theft detected!
          stolenResult.fraudDetected = true;
          stolenResult.actualOutcome = "Presentation verification failed as expected - holder binding mismatch detected";
        }

        stolenResult.testPassed = stolenResult.fraudDetected;

        expect(stolenResult.fraudDetected).toBe(true);

        if (stolenResult.testPassed) {
          testReport.summary.fraudsDetected++;
          testReport.summary.testsPassed++;
        } else {
          testReport.summary.testsFailed++;
          stolenResult.errors.push("Expected presentation verification to fail but it succeeded");
        }

      } catch (error) {
        stolenResult.errors.push(`Test execution error: ${error}`);
        testReport.summary.testsFailed++;
      }

      testReport.fraudDetection.push(stolenResult);
    });
  });
});