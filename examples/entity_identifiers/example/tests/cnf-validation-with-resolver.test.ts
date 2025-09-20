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

test("presentation with cnf claim must be signed by the specified key using controller resolver", async () => {
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
      kid: holderAuthKeyId! // Holder's key as confirmation (top-level)
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

  // Sign presentation with holder's key (correct key)
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  // Verify presentation with credential validation using controller resolver
  const holderPublicKey = await key.exportPublicKey(holderController.privateKey);
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, controllerResolver);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});

test("presentation with cnf claim fails when signed by wrong key using controller resolver", async () => {
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

  // Get holder's authentication key ID
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
      kid: holderAuthKeyId! // Requires holder's key (top-level)
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

  // Sign presentation with WRONG key
  const presentationSigner = await presentation.signer(wrongController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller],
    ["https://wrong.example", wrongController.controller]
  ]);

  // Try to verify presentation with wrong key
  const wrongPublicKey = await key.exportPublicKey(wrongController.privateKey);
  const presentationVerifier = await presentation.verifierWithCredentialValidation(wrongPublicKey);

  // This should fail because presentation is signed with wrong key
  // Extract just the kid part if holderAuthKeyId is a full verification method ID
  let expectedKid = holderAuthKeyId!;
  if (expectedKid.includes('#')) {
    expectedKid = expectedKid.split('#')[1];
  }
  await expect(presentationVerifier.verify(signedPresentation, controllerResolver))
    .rejects.toThrow(`Presentation key mismatch: credential requires key ${expectedKid} but presentation was signed with ${wrongPublicKey.kid}`);
});

test("presentation without cnf claim can be signed by any key using controller resolver", async () => {
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

  // Create credential WITHOUT cnf claim
  const credentialWithoutCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
      // No cnf claim
    }
  };

  // Sign credential with issuer's key
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(credentialWithoutCnf);

  // Create enveloped credential
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign presentation with holder key (should work without cnf)
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  // Verify presentation should succeed
  const holderPublicKey = await key.exportPublicKey(holderController.privateKey);
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, controllerResolver);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});

test("multiple credentials with cnf claims using controller resolver", async () => {
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

  // Create first credential with cnf claim
  const credential1: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      role: "admin"
    },
    cnf: {
      kid: holderAuthKeyId!
    }
  };

  // Create second credential with same cnf claim
  const credential2: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      role: "developer"
    },
    cnf: {
      kid: holderAuthKeyId!
    }
  };

  // Sign both credentials
  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential1 = await credentialSigner.sign(credential1);
  const signedCredential2 = await credentialSigner.sign(credential2);

  // Create enveloped credentials
  const envelopedCredential1 = credential.createEnvelopedVerifiableCredential(signedCredential1);
  const envelopedCredential2 = credential.createEnvelopedVerifiableCredential(signedCredential2);

  // Create presentation with both credentials
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential1, envelopedCredential2]
  };

  // Sign presentation with holder's key
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  // Verify presentation with both credentials
  const holderPublicKey = await key.exportPublicKey(holderController.privateKey);
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);
  const verifiedPresentation = await presentationVerifier.verify(signedPresentation, controllerResolver);

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.verifiableCredential).toHaveLength(2);
});

test("verify fails when issuer controller cannot be resolved", async () => {
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

  // Sign presentation
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData);

  // Create controller resolver WITHOUT the issuer
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
    // Missing issuer controller
  ]);

  // Try to verify - should fail because issuer cannot be resolved
  const holderPublicKey = await key.exportPublicKey(holderController.privateKey);
  const presentationVerifier = await presentation.verifierWithCredentialValidation(holderPublicKey);

  await expect(presentationVerifier.verify(signedPresentation, controllerResolver))
    .rejects.toThrow("Controller not found for id: https://issuer.example");
});