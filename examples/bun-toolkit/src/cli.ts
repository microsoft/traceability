#!/usr/bin/env bun

import { parseArgs } from "util";
import { key, controller, credential, presentation, resolver } from "./index";
import { createControllerBuilder } from "./controller/builder";
import type { VerifiableCredential } from "./credential/credential";
import type { VerifiablePresentation } from "./presentation/presentation";

function printHelp() {
  console.log(`
Verifiable Supply Chain CLI

Usage: bun cli.ts <command> [options]

Commands:
  generate-keys --out <file>                    Generate key pair and save to file
  generate-controller --config <file> --out <file>   Generate controller from config file
  sign-credential --key <file> --cred <file> --out <file>   Sign credential with private key
  sign-presentation --key <file> --pres <file> --out <file> Sign presentation with private key
  verify-credential --cred <file> --key <file>           Verify credential with public key
  verify-presentation --pres <file> --resolver <file>    Verify presentation with resolver
  extract-public-key --key <file> --out <file>           Extract public key from private key
  help                                          Show this help message

Examples:
  bun cli.ts generate-keys --out entity1-keys.json
  bun cli.ts generate-controller --config entity1-config.json --out entity1-controller.json
  bun cli.ts sign-credential --key entity1-keys.json --cred shipment.json --out signed-shipment.json
  bun cli.ts verify-credential --cred signed-shipment.json --key entity1-public.json
`);
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
    const keys = builder.getGeneratedKeys();

    const output = {
      controller: controllerDoc,
      generatedKeys: keys,
      generated: new Date().toISOString()
    };

    await Bun.write(outputFile, JSON.stringify(output, null, 2));
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

    const privateKey = keyData.privateKey || keyData; // Support both formats
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

    const privateKey = keyData.privateKey || keyData; // Support both formats
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

    const publicKey = keyData.publicKey || keyData; // Support both formats
    const verifier = await credential.verifier(publicKey);
    const result = await verifier.verify(signedCredential);

    console.log(`✅ Credential verification successful`);
    console.log(JSON.stringify(result, null, 2));
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
    const privateKey = keyData.privateKey || keyData; // Support both formats
    const publicKey = await key.exportPublicKey(privateKey);

    await Bun.write(outputFile, JSON.stringify(publicKey, null, 2));
    console.log(`✅ Public key saved to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error extracting public key: ${error}`);
    process.exit(1);
  }
}

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    out: { type: 'string' },
    config: { type: 'string' },
    key: { type: 'string' },
    cred: { type: 'string' },
    pres: { type: 'string' },
    resolver: { type: 'string' },
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

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
} catch (error) {
  console.error(`Error: ${error}`);
  process.exit(1);
}