import { test, expect } from "bun:test";
import * as jose from "jose";
import * as key from "../src/key";
import * as credential from "../src/credential";
import { base64url } from "../src/encoding";

/**
 * Cross-testing our JWS implementation against the well-established jose library
 * to ensure cryptographic compatibility and correctness.
 */

test("JWS Cross-Compatibility: Our signer, jose verifier", async () => {
  // Generate a key pair using our implementation
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  // Create a test credential
  const testCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: "https://example.com/issuer",
    credentialSubject: {
      id: "https://example.com/subject",
      name: "Test Subject"
    }
  };

  // Sign using our implementation
  const ourSigner = await credential.signer(privateKey);
  const ourJWS = await ourSigner.sign(testCredential);

  // Parse the JWS to extract components
  const [protectedHeader, payload, signature] = ourJWS.split('.');

  // Decode header to verify structure
  const headerBytes = base64url.decode(protectedHeader);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));

  // Convert our JWK to jose-compatible format
  const josePublicKey = await jose.importJWK({
    kty: publicKey.kty,
    crv: publicKey.crv,
    x: publicKey.x,
    y: publicKey.y,
    alg: publicKey.alg
  });

  // Verify using jose library
  const joseResult = await jose.jwtVerify(ourJWS, josePublicKey, {
    algorithms: [publicKey.alg]
  });

  // The payloads should match (accounting for JWT time claims)
  expect(joseResult.payload.credentialSubject).toEqual(testCredential.credentialSubject);
  expect(joseResult.payload.issuer).toBe(testCredential.issuer);
  expect(joseResult.payload.type).toEqual(testCredential.type);
});

test("JWS Cross-Compatibility: Jose signer, our verifier", async () => {
  // Generate a key pair using jose with extractable flag
  const joseKeyPair = await jose.generateKeyPair("ES256", { extractable: true });

  // Export the keys to JWK format
  const josePrivateJWK = await jose.exportJWK(joseKeyPair.privateKey);
  const josePublicJWK = await jose.exportJWK(joseKeyPair.publicKey);

  // Calculate thumbprint for kid (matching our implementation)
  const serializedKey = `{"crv":"${josePublicJWK.crv}","kty":"${josePublicJWK.kty}","x":"${josePublicJWK.x}","y":"${josePublicJWK.y}"}`;
  const thumbprintBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serializedKey));
  const kid = base64url.encode(new Uint8Array(thumbprintBuffer));

  // Create test credential
  const testCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: "https://example.com/issuer",
    credentialSubject: {
      id: "https://example.com/subject",
      name: "Test Subject"
    }
  };

  // Sign using jose
  const joseJWS = await new jose.SignJWT(testCredential)
    .setProtectedHeader({ alg: "ES256", typ: "vc+jwt", kid })
    .setIssuedAt()
    .sign(joseKeyPair.privateKey);

  // Convert jose JWK to our format for verification
  const ourPublicKey = {
    kid,
    kty: josePublicJWK.kty!,
    crv: josePublicJWK.crv!,
    alg: "ES256" as const,
    x: josePublicJWK.x!,
    y: josePublicJWK.y!,
    key_ops: ["verify"] as const
  };

  // Verify using our implementation
  const ourVerifier = await credential.verifier(ourPublicKey);
  const ourResult = await ourVerifier.verify(joseJWS);

  // The payloads should match
  expect(ourResult.credentialSubject).toEqual(testCredential.credentialSubject);
  expect(ourResult.issuer).toBe(testCredential.issuer);
  expect(ourResult.type).toEqual(testCredential.type);
  expect(typeof ourResult.iat).toBe("number"); // JWT issued at time should be present
});

test("JWS Cross-Compatibility: Round-trip compatibility", async () => {
  // Use the same key for both implementations
  const ourPrivateKey = await key.generatePrivateKey("ES256");
  const ourPublicKey = await key.exportPublicKey(ourPrivateKey);

  // Convert to jose-compatible keys
  const josePrivateKey = await jose.importJWK({
    kty: ourPrivateKey.kty,
    crv: ourPrivateKey.crv,
    x: ourPrivateKey.x,
    y: ourPrivateKey.y,
    d: ourPrivateKey.d,
    alg: ourPrivateKey.alg
  });

  const josePublicKey = await jose.importJWK({
    kty: ourPublicKey.kty,
    crv: ourPublicKey.crv,
    x: ourPublicKey.x,
    y: ourPublicKey.y,
    alg: ourPublicKey.alg
  });

  const testCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: "https://example.com/issuer",
    credentialSubject: {
      id: "https://example.com/subject",
      name: "Round-trip Test"
    }
  };

  // Step 1: Our sign -> Jose verify
  const ourSigner = await credential.signer(ourPrivateKey);
  const ourJWS = await ourSigner.sign(testCredential);

  const joseResult1 = await jose.jwtVerify(ourJWS, josePublicKey, {
    algorithms: ["ES256"]
  });

  // Step 2: Jose sign -> Our verify
  const joseJWS = await new jose.SignJWT(testCredential)
    .setProtectedHeader({ alg: "ES256", typ: "vc+jwt", kid: ourPublicKey.kid })
    .setIssuedAt()
    .sign(josePrivateKey);

  const ourVerifier = await credential.verifier(ourPublicKey);
  const ourResult2 = await ourVerifier.verify(joseJWS);

  // Both should have decoded the same core credential data
  expect(joseResult1.payload.credentialSubject).toEqual(testCredential.credentialSubject);
  expect(ourResult2.credentialSubject).toEqual(testCredential.credentialSubject);
});

test("JWS Signature Format Compatibility", async () => {
  // Generate key pair
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  // Test data
  const testData = new TextEncoder().encode("test message for signing");

  // Sign using our implementation
  const ourSigner = await key.signer(privateKey);
  const ourSignature = await ourSigner.sign(testData);

  // Import same key into jose
  const josePrivateKey = await jose.importJWK({
    kty: privateKey.kty,
    crv: privateKey.crv,
    x: privateKey.x,
    y: privateKey.y,
    d: privateKey.d,
    alg: privateKey.alg
  });

  const josePublicKey = await jose.importJWK({
    kty: publicKey.kty,
    crv: publicKey.crv,
    x: publicKey.x,
    y: publicKey.y,
    alg: publicKey.alg
  });

  // Verify our signature using jose
  const isValidInJose = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    josePublicKey,
    ourSignature,
    testData
  );

  expect(isValidInJose).toBe(true);

  // Generate an extractable version for raw signing
  const extractableJoseKeyPair = await jose.generateKeyPair("ES256", { extractable: true });

  // Sign using Web Crypto API (jose uses this internally)
  const cryptoSignature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    extractableJoseKeyPair.privateKey,
    testData
  );

  // Export the extractable public key to verify with our implementation
  const extractablePublicJWK = await jose.exportJWK(extractableJoseKeyPair.publicKey);
  const extractablePublicKey = {
    kid: publicKey.kid, // Use same kid for consistency
    kty: extractablePublicJWK.kty!,
    crv: extractablePublicJWK.crv!,
    alg: "ES256" as const,
    x: extractablePublicJWK.x!,
    y: extractablePublicJWK.y!,
    key_ops: ["verify"] as const
  };

  // Verify crypto signature using our implementation
  const ourVerifier = await key.verifier(extractablePublicKey);
  const isValidInOurs = await ourVerifier.verify(testData, new Uint8Array(cryptoSignature));

  expect(isValidInOurs).toBe(true);
});

test("JWT Time Claims Compatibility", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const futureTime = new Date(Date.now() + 60000); // 1 minute in future
  const pastTime = new Date(Date.now() - 60000);   // 1 minute in past

  const credentialWithTimes = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    issuer: "https://example.com/issuer",
    credentialSubject: {
      id: "https://example.com/subject"
    },
    validFrom: pastTime.toISOString(),
    validUntil: futureTime.toISOString()
  };

  // Sign with our implementation (should convert validFrom/validUntil to nbf/exp)
  const ourSigner = await credential.signer(privateKey);
  const ourJWS = await ourSigner.sign(credentialWithTimes);

  // Verify with jose
  const josePublicKey = await jose.importJWK({
    kty: publicKey.kty,
    crv: publicKey.crv,
    x: publicKey.x,
    y: publicKey.y,
    alg: publicKey.alg
  });

  const joseResult = await jose.jwtVerify(ourJWS, josePublicKey, {
    algorithms: ["ES256"]
  });

  // Verify time claims were converted correctly
  expect(typeof joseResult.payload.iat).toBe("number");
  expect(typeof joseResult.payload.nbf).toBe("number");
  expect(typeof joseResult.payload.exp).toBe("number");
  expect(joseResult.payload.nbf).toBeLessThan(joseResult.payload.exp);
});