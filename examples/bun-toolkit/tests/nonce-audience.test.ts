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

test("presentation with nonce", async () => {
  // Create controllers
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

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

  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(testCredential);
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign with nonce
  const nonce = "challenge-123456";
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, {
    nonce: nonce
  });

  // Create resolver and verify with expected nonce
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);
  const verifiedPresentation = await verifier.verify(signedPresentation, {
    expectedNonce: nonce
  });

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});

test("presentation with wrong nonce fails", async () => {
  // Create controllers
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  // Sign with nonce
  const nonce = "challenge-123456";
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, {
    nonce: nonce
  });

  // Create resolver and verify with wrong nonce
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);

  await expect(verifier.verify(signedPresentation, {
    expectedNonce: "wrong-nonce"
  })).rejects.toThrow("Nonce mismatch: expected wrong-nonce but got challenge-123456");
});

test("presentation without nonce when nonce is required fails", async () => {
  // Create controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create presentation without nonce
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData); // No nonce

  // Create resolver and verify expecting nonce
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);

  await expect(verifier.verify(signedPresentation, {
    expectedNonce: "required-nonce"
  })).rejects.toThrow("Nonce is required but not present in presentation");
});

test("presentation with single audience", async () => {
  // Create controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  // Sign with audience
  const audience = "https://verifier.example";
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, {
    audience: audience
  });

  // Verify with expected audience
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);
  const verifiedPresentation = await verifier.verify(signedPresentation, {
    expectedAudience: audience
  });

  expect(verifiedPresentation).toBeDefined();
});

test("presentation with multiple audiences", async () => {
  // Create controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  // Sign with multiple audiences
  const audiences = ["https://verifier1.example", "https://verifier2.example"];
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, {
    audience: audiences
  });

  // Verify with one of the audiences
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);

  // Should accept if expecting any of the audiences
  const verifiedPresentation = await verifier.verify(signedPresentation, {
    expectedAudience: "https://verifier2.example"
  });

  expect(verifiedPresentation).toBeDefined();

  // Should also accept if expecting multiple including one that matches
  const verifiedPresentation2 = await verifier.verify(signedPresentation, {
    expectedAudience: ["https://verifier3.example", "https://verifier1.example"]
  });

  expect(verifiedPresentation2).toBeDefined();
});

test("presentation with wrong audience fails", async () => {
  // Create controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  // Sign with audience
  const audience = "https://verifier.example";
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, {
    audience: audience
  });

  // Verify with wrong audience
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);

  await expect(verifier.verify(signedPresentation, {
    expectedAudience: "https://wrong-verifier.example"
  })).rejects.toThrow("Audience mismatch: expected one of [https://wrong-verifier.example] but got [https://verifier.example]");
});

test("presentation without audience when audience is required fails", async () => {
  // Create controller
  const holderController = await createController(
    "https://holder.example",
    ["https://holder.example"],
    holderGeometry,
    holderAddress,
    "ES256"
  );

  // Create presentation without audience
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData); // No audience

  // Verify expecting audience
  const controllerResolver = await resolver.createControllerResolver([
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);

  await expect(verifier.verify(signedPresentation, {
    expectedAudience: "https://verifier.example"
  })).rejects.toThrow("Audience is required but not present in presentation");
});

test("presentation with both nonce and audience", async () => {
  // Create controllers
  const issuerController = await createController(
    "https://issuer.example",
    ["https://issuer.example"],
    issuerGeometry,
    issuerAddress,
    "ES256"
  );

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

  const credentialSigner = await credential.signer(issuerController.privateKey);
  const signedCredential = await credentialSigner.sign(testCredential);
  const envelopedCredential = credential.createEnvelopedVerifiableCredential(signedCredential);

  // Create presentation
  const presentationData: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example",
    verifiableCredential: [envelopedCredential]
  };

  // Sign with both nonce and audience
  const nonce = "challenge-789";
  const audience = ["https://verifier1.example", "https://verifier2.example"];
  const presentationSigner = await presentation.signer(holderController.privateKey);
  const signedPresentation = await presentationSigner.sign(presentationData, {
    nonce: nonce,
    audience: audience
  });

  // Verify with expected nonce and audience
  const controllerResolver = await resolver.createControllerResolver([
    ["https://issuer.example", issuerController.controller],
    ["https://holder.example", holderController.controller]
  ]);

  const verifier = await presentation.verifierWithControllerResolver(controllerResolver);
  const verifiedPresentation = await verifier.verify(signedPresentation, {
    expectedNonce: nonce,
    expectedAudience: "https://verifier1.example"
  });

  expect(verifiedPresentation).toBeDefined();
  expect(verifiedPresentation.holder).toBe("https://holder.example");
});