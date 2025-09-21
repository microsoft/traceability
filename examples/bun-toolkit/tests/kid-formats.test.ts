import { test, expect } from "bun:test";
import { key, credential, presentation, resolver } from "../src";
import type { VerifiableCredential } from "../src/credential/credential";
import type { VerifiablePresentation } from "../src/presentation/presentation";
import type { PrivateKey, PublicKey } from "../src/types";

test("resolve keys by full verification method ID", async () => {
  // Create a key pair
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  // Create resolver with full verification method ID
  const fullId = `https://example.com#${publicKey.kid}`;
  const keyResolver = await resolver.createPublicKeyResolver(
    [[fullId, publicKey]],
    'assertion'
  );

  // Should resolve by full ID
  const verifierByFullId = await keyResolver.resolve(fullId);
  expect(verifierByFullId).toBeDefined();

  // Should also resolve by just the kid
  const verifierByKid = await keyResolver.resolve(publicKey.kid);
  expect(verifierByKid).toBeDefined();
});

test("resolve keys by raw kid only", async () => {
  // Create a key pair
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  // Create resolver with just the kid (no full ID)
  const keyResolver = await resolver.createPublicKeyResolver(
    [[publicKey.kid, publicKey]],
    'assertion'
  );

  // Should resolve by kid
  const verifierByKid = await keyResolver.resolve(publicKey.kid);
  expect(verifierByKid).toBeDefined();
});

test("credential signed with full verification method ID as kid", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Modify the private key to use full verification method ID as kid
  const fullKidPrivateKey: PrivateKey = {
    ...issuerPrivateKey,
    kid: `https://issuer.example#${issuerPrivateKey.kid}`
  };

  const fullKidPublicKey: PublicKey = {
    ...issuerPublicKey,
    kid: `https://issuer.example#${issuerPublicKey.kid}`
  };

  // Create credential
  const testCredential: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://subject.example",
      name: "Test Subject"
    }
  };

  // Sign credential with full kid
  const credentialSigner = await credential.signer(fullKidPrivateKey);
  const signedCredential = await credentialSigner.sign(testCredential, { kid: fullKidPrivateKey.kid });

  // Verify with resolver that indexes by full ID
  const keyResolver = await resolver.createPublicKeyResolver(
    [[fullKidPublicKey.kid, fullKidPublicKey]],
    'assertion'
  );

  // Should be able to verify
  const verifier = await keyResolver.resolve(fullKidPublicKey.kid);
  const verifiedCredential = await verifier.verify(signedCredential);

  // Check core credential properties
  expect(verifiedCredential["@context"]).toEqual(testCredential["@context"]);
  expect(verifiedCredential.type).toEqual(testCredential.type);
  expect(verifiedCredential.issuer).toBe(testCredential.issuer);
  expect(verifiedCredential.credentialSubject).toEqual(testCredential.credentialSubject);
  // Check JWT claims are added
  expect(verifiedCredential.iat).toBeDefined();
  expect(typeof verifiedCredential.iat).toBe('number');
});

test("presentation signed with raw kid only", async () => {
  // Create holder key with raw kid
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create presentation
  const testPresentation: VerifiablePresentation = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiablePresentation"],
    holder: "https://holder.example"
  };

  // Sign presentation with raw kid
  const presentationSigner = await presentation.signer(holderPrivateKey);
  const signedPresentation = await presentationSigner.sign(testPresentation, { kid: holderPrivateKey.kid });

  // Create resolver that indexes by raw kid
  const keyResolver = await resolver.createPublicKeyResolver(
    [[holderPublicKey.kid, holderPublicKey]],
    'authentication'
  );

  // Should be able to verify
  const verifier = await keyResolver.resolve(holderPublicKey.kid);
  const verifiedPresentation = await verifier.verify(signedPresentation);

  // Check core presentation properties
  expect(verifiedPresentation["@context"]).toEqual(testPresentation["@context"]);
  expect(verifiedPresentation.type).toEqual(testPresentation.type);
  expect(verifiedPresentation.holder).toBe(testPresentation.holder);
  // Check JWT claims are added
  expect(verifiedPresentation.iat).toBeDefined();
  expect(verifiedPresentation.exp).toBeDefined();
  expect(typeof verifiedPresentation.iat).toBe('number');
  expect(typeof verifiedPresentation.exp).toBe('number');
});

test("mixed kid formats in same resolver", async () => {
  // Create multiple keys
  const key1Private = await key.generatePrivateKey("ES256");
  const key1Public = await key.exportPublicKey(key1Private);

  const key2Private = await key.generatePrivateKey("ES256");
  const key2Public = await key.exportPublicKey(key2Private);

  const key3Private = await key.generatePrivateKey("ES256");
  const key3Public = await key.exportPublicKey(key3Private);

  // Create resolver with mixed formats
  const keyResolver = await resolver.createPublicKeyResolver(
    [
      [`https://example.com#${key1Public.kid}`, key1Public],  // Full ID
      [key2Public.kid, key2Public],                           // Raw kid
      [`did:example:123#${key3Public.kid}`, key3Public]       // DID format
    ],
    'assertion'
  );

  // Should resolve key1 by both full ID and raw kid
  const verifier1ByFull = await keyResolver.resolve(`https://example.com#${key1Public.kid}`);
  expect(verifier1ByFull).toBeDefined();
  const verifier1ByKid = await keyResolver.resolve(key1Public.kid);
  expect(verifier1ByKid).toBeDefined();

  // Should resolve key2 by raw kid
  const verifier2 = await keyResolver.resolve(key2Public.kid);
  expect(verifier2).toBeDefined();

  // Should resolve key3 by both DID format and raw kid
  const verifier3ByDid = await keyResolver.resolve(`did:example:123#${key3Public.kid}`);
  expect(verifier3ByDid).toBeDefined();
  const verifier3ByKid = await keyResolver.resolve(key3Public.kid);
  expect(verifier3ByKid).toBeDefined();
});

test("cnf claim with full verification method ID", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create credential with cnf using full verification method ID
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    },
    cnf: {
      kid: `https://holder.example#${holderPublicKey.kid}` // Full ID in cnf
    }
  };

  // Sign credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf, { kid: issuerPrivateKey.kid });

  // Verify credential
  const issuerResolver = await resolver.createPublicKeyResolver(
    [[issuerPublicKey.kid, issuerPublicKey]],
    'assertion'
  );
  const credVerifier = await issuerResolver.resolve(issuerPublicKey.kid);
  const verifiedCredential = await credVerifier.verify(signedCredential);

  // Check cnf claim has full ID
  expect(verifiedCredential.cnf?.kid).toBe(`https://holder.example#${holderPublicKey.kid}`);
});

test("cnf claim with raw kid only", async () => {
  // Create issuer key
  const issuerPrivateKey = await key.generatePrivateKey("ES256");
  const issuerPublicKey = await key.exportPublicKey(issuerPrivateKey);

  // Create holder key
  const holderPrivateKey = await key.generatePrivateKey("ES256");
  const holderPublicKey = await key.exportPublicKey(holderPrivateKey);

  // Create credential with cnf using raw kid
  const credentialWithCnf: VerifiableCredential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential"],
    issuer: "https://issuer.example",
    credentialSubject: {
      id: "https://holder.example",
      name: "Test Holder"
    },
    cnf: {
      kid: holderPublicKey.kid // Raw kid in cnf
    }
  };

  // Sign credential
  const credentialSigner = await credential.signer(issuerPrivateKey);
  const signedCredential = await credentialSigner.sign(credentialWithCnf, { kid: issuerPrivateKey.kid });

  // Verify credential
  const issuerResolver = await resolver.createPublicKeyResolver(
    [[issuerPublicKey.kid, issuerPublicKey]],
    'assertion'
  );
  const credVerifier = await issuerResolver.resolve(issuerPublicKey.kid);
  const verifiedCredential = await credVerifier.verify(signedCredential);

  // Check cnf claim has raw kid
  expect(verifiedCredential.cnf?.kid).toBe(holderPublicKey.kid);
});