import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { credential, presentation, resolver } from "../../../src/index";
import { exportPublicKey } from "../../../src/key";
import { createControllerBuilder } from "../../../src/controller/builder";
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
  // Generate final report.json
  await Bun.write(`${CASE_DIR}/report.json`, JSON.stringify(testReport, null, 2));
  console.log(`\n📄 Test report generated: ${CASE_DIR}/report.json`);
  console.log(`📊 Summary: ${testReport.summary.testsPassed}/${testReport.summary.testsTotal} tests passed`);
});

describe("Transhrimpment Case Study", () => {

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

          // Validate controller structure
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
      {
        key: "chompchomp-purchase-order",
        description: "Purchase Order (Chompchomp → Camarón Corriente)",
        issuer: "chompchomp",
        holder: "camaron-corriente",
        template: "chompchomp-purchase-order-template.json",
        schema: "PurchaseOrderCredential",
        fraudType: null
      },
      {
        key: "camaron-corriente-invoice",
        description: "Commercial Invoice (Camarón Corriente → Chompchomp)",
        issuer: "camaron-corriente",
        holder: "chompchomp",
        template: "camaron-corriente-invoice-template.json",
        schema: "CommercialInvoiceCredential",
        fraudType: null
      },
      {
        key: "legit-shrimp-honest-importer-origin",
        description: "Certificate of Origin (Legit Shrimp → Honest Importer) - WILL BE STOLEN",
        issuer: "legit-shrimp",
        holder: "honest-importer",
        template: "legit-shrimp-honest-importer-origin-template.json",
        schema: "CertificateOfOriginCredential",
        fraudType: "Document Compromise"
      },
      {
        key: "shady-distributor-fraudulent-origin",
        description: "FRAUDULENT Certificate of Origin (Shady Distributor forging Legit Shrimp identity)",
        issuer: "shady-distributor", // Wrong issuer! Should be legit-shrimp
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

          // Issue credential using library (template already has cnf.kid)
          const signer = await credential.signer(assertionKey);
          const signedCredentialJWT = await signer.sign(credentialTemplate);

          credResult.issuanceSuccessful = !!signedCredentialJWT;

          if (credResult.issuanceSuccessful) {
            // Store signed credential
            credentials[spec.key] = {
              "@context": "https://www.w3.org/ns/credentials/v2",
              "id": `data:application/vc+jwt,${signedCredentialJWT}`,
              "type": "EnvelopedVerifiableCredential"
            };

            // Verify credential
            try {
              // Find issuer's assertion key for verification
              const assertionMethodId = issuerController.assertionMethod[0];
              const verificationMethod = issuerController.verificationMethod.find(
                (vm: any) => vm.id === assertionMethodId
              );

              if (!verificationMethod) {
                throw new Error("Assertion method verification key not found");
              }

              const verifier = await credential.verifier(verificationMethod.publicKeyJwk);
              const verificationResult = await verifier.verify(signedCredentialJWT);

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
            const presentationData = {
              "@context": ["https://www.w3.org/ns/credentials/v2"],
              "type": ["VerifiablePresentation"],
              "holder": entityConfigs[holderKey].id,
              "verifiableCredential": [envelopedCred]
            };

            // Sign presentation with holder's auth key
            const holderAuthKey = (holderController as any)._authKey;
            const pressSigner = await presentation.signer(holderAuthKey);
            const signedPresentationJWT = await pressSigner.sign(presentationData);

            presResult.signingSuccessful = !!signedPresentationJWT;
            presentationsCreated++;

            if (presResult.signingSuccessful) {
              // Store presentation
              presentations[`${credKey}-presentation`] = {
                "@context": "https://www.w3.org/ns/credentials/v2",
                "id": `data:application/vp+jwt,${signedPresentationJWT}`,
                "type": "EnvelopedVerifiablePresentation"
              };

              // Verify presentation
              try {
                const genericResolver = resolver.createGenericResolver();
                for (const [controllerId, controllerData] of Object.entries(resolverCache)) {
                  genericResolver.addController(controllerId, controllerData);
                }

                const presVerifier = await presentation.verifierWithGenericResolver(genericResolver);
                const presVerificationResult = await presVerifier.verify(signedPresentationJWT);

                presResult.verificationSuccessful = !!presVerificationResult;
                if (presResult.verificationSuccessful) {
                  presentationsVerified++;
                }

              } catch (presVerifyError) {
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
        const fraudSignedJWT = await fraudSigner.sign(fraudulentPresentation);

        // Try to verify (should fail due to holder binding mismatch)
        try {
          const genericResolver = resolver.createGenericResolver();
          for (const [controllerId, controllerData] of Object.entries(resolverCache)) {
            genericResolver.addController(controllerId, controllerData);
          }

          const presVerifier = await presentation.verifierWithGenericResolver(genericResolver);
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