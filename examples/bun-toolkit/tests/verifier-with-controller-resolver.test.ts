import { test, expect } from "bun:test";
import { key, credential, presentation, resolver } from "../src";
import { createController } from "../src/controller/controller";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";

// Test data for controllers
const issuerGeometry = {
  type: "Point" as const,
  coordinates: [-122.4194, 37.7749] as [number, number]
};

const holderGeometry = {
  type: "Point" as const,
  coordinates: [-122.4094, 37.7849] as [number, number]
};

const issuerAddress = {
  streetAddress: "123 Issuer Street",
  addressLocality: "San Francisco",
  addressRegion: "CA",
  postalCode: "94102",
  addressCountry: "US"
};

const holderAddress = {
  streetAddress: "456 Holder Avenue",
  addressLocality: "Oakland",
  addressRegion: "CA",
  postalCode: "94601",
  addressCountry: "US"
};

test("verify presentation with controller resolver at top level", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create credential
  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(testCredential);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder's key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  // Create verifier with controller resolver at top level
  const presentationVerifier = await presentation.verifierWithControllerResolver(controllerResolver);

  // Verify presentation
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
  expect(verifiedPresentation.verifiableCredential).toHaveLength(1);
});

test("verify presentation with cnf claim using controller resolver", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Get holder's authentication key ID
  const holderAuthKeyId = holderController.controller.verificationMethod.find(
    vm => holderController.controller.authentication.includes(vm.id)
  )?.id;

  // Create credential with cnf claim
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    },
    cnf: {
      kid: holderAuthKeyId! // Holder's key as confirmation
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder's key (correct key per cnf)
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  // Create verifier with controller resolver
  const presentationVerifier = await presentation.verifierWithControllerResolver(controllerResolver);

  // Verify presentation
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});

test("fail when holder controller cannot be resolved", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller (but don't add to resolver)
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create credential
  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(testCredential);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder's key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver WITHOUT the holder
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller]
    // Missing holder controller
  ]);

  // Create verifier with controller resolver
  const presentationVerifier = await presentation.verifierWithControllerResolver(controllerResolver);

  // Should fail because holder cannot be resolved
  await expect(presentationVerifier.verify(signedPresentation))
    .rejects.toThrow("Controller not found for id: https://holder.example");
});

test("fail when issuer controller cannot be resolved", async () => {
  // Create issuer controller (but don't add to resolver)
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create credential
  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(testCredential);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder's key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver WITHOUT the issuer
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
    // Missing issuer controller
  ]);

  // Create verifier with controller resolver
  const presentationVerifier = await presentation.verifierWithControllerResolver(controllerResolver);

  // Should fail because issuer cannot be resolved
  await expect(presentationVerifier.verify(signedPresentation))
    .rejects.toThrow("Controller not found for id: https://issuer.example");
});

test("fail when cnf claim doesn't match presentation signer", async () => {
  // Create issuer controller
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

  // Create holder controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create wrong signer controller
  const wrongController = await createController(
    "https://wrong.example",
    ["https://wrong.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Get holder's authentication key ID (for cnf)
  const holderAuthKeyId = holderController.controller.verificationMethod.find(
    vm => holderController.controller.authentication.includes(vm.id)
  )?.id;

  // Create credential with cnf claim pointing to holder's key
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    },
    cnf: {
      kid: holderAuthKeyId! // Requires holder's key
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation with wrong holder
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://wrong.example", // Wrong holder!
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with wrong key
  const presentationSigner = await presentation.signer(wrongController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller],
    ["https://wrong.example", wrongController.controller]
  ]);

  // Create verifier with controller resolver
  const presentationVerifier = await presentation.verifierWithControllerResolver(controllerResolver);

  // Extract just the kid part for error message
  let expectedKid = holderAuthKeyId!;
  if (expectedKid.includes('#')) {
    expectedKid = expectedKid.split('#')[1];
  }

  const wrongKey = await key.exportPublicKey(wrongController.privateKey);

  // Should fail because cnf doesn't match
  await expect(presentationVerifier.verify(signedPresentation))
    .rejects.toThrow(`Presentation key mismatch: credential requires key ${expectedKid} but presentation was signed with ${wrongKey.kid}`);
});