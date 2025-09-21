import { test, expect } from "bun:test";
import { key } from "../index";

test("generate ES256 private key", async () => {
  const privateKey = await key.generatePrivateKey("ES256");

  expect(privateKey).toBeDefined();
  expect(privateKey.kty).toBe("EC");
  expect(privateKey.crv).toBe("P-256");
  expect(privateKey.alg).toBe("ES256");
  expect(privateKey.kid).toBeDefined();
  expect(privateKey.d).toBeDefined(); // private key component
  expect(privateKey.x).toBeDefined();
  expect(privateKey.y).toBeDefined();
});

test("generate ES384 private key", async () => {
  const privateKey = await key.generatePrivateKey("ES384");

  expect(privateKey).toBeDefined();
  expect(privateKey.kty).toBe("EC");
  expect(privateKey.crv).toBe("P-384");
  expect(privateKey.alg).toBe("ES384");
  expect(privateKey.kid).toBeDefined();
  expect(privateKey.d).toBeDefined();
  expect(privateKey.x).toBeDefined();
  expect(privateKey.y).toBeDefined();
});

test("export public key from private key", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  expect(publicKey).toBeDefined();
  expect(publicKey.kty).toBe("EC");
  expect(publicKey.crv).toBe("P-256");
  expect(publicKey.alg).toBe("ES256");
  expect(publicKey.kid).toBe(privateKey.kid);
  expect(publicKey.x).toBe(privateKey.x);
  expect(publicKey.y).toBe(privateKey.y);
  expect(publicKey.d).toBeUndefined(); // no private component
});

test("key thumbprint calculation", async () => {
  const testPublicKey = {
    kty: 'EC',
    crv: 'P-256',
    alg: 'ES256',
    x: 'jJ6Flys3zK9jUhnOHf6G49Dyp5hah6CNP84-gY-n9eo',
    y: 'nhI6iD5eFXgBTLt_1p3aip-5VbZeMhxeFSpjfEAf7Ww',
    key_ops: ['verify'],
  };

  const thumbprint = await key.calculateThumbprint(testPublicKey);
  expect(thumbprint).toBe("w9eYdC6_s_tLQ8lH6PUpc0mddazaqtPgeC2IgWDiqY8");
});

test("sign and verify data", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await key.signer(privateKey);
  const verifier = await key.verifier(publicKey);

  const testData = new TextEncoder().encode("Hello, world!");
  const signature = await signer.sign(testData);
  const isValid = await verifier.verify(testData, signature);

  expect(signature).toBeDefined();
  expect(signature).toBeInstanceOf(Uint8Array);
  expect(isValid).toBe(true);
});

test("verify with wrong data fails", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);

  const signer = await key.signer(privateKey);
  const verifier = await key.verifier(publicKey);

  const originalData = new TextEncoder().encode("Original message");
  const tamperedData = new TextEncoder().encode("Tampered message");

  const signature = await signer.sign(originalData);
  const isValid = await verifier.verify(tamperedData, signature);

  expect(isValid).toBe(false);
});

test("verify with wrong public key fails", async () => {
  const privateKey1 = await key.generatePrivateKey("ES256");
  const privateKey2 = await key.generatePrivateKey("ES256");
  const publicKey2 = await key.exportPublicKey(privateKey2);

  const signer = await key.signer(privateKey1);
  const verifier = await key.verifier(publicKey2);

  const testData = new TextEncoder().encode("Test message");
  const signature = await signer.sign(testData);
  const isValid = await verifier.verify(testData, signature);

  expect(isValid).toBe(false);
});

test("different algorithms generate different keys", async () => {
  const es256Key = await key.generatePrivateKey("ES256");
  const es384Key = await key.generatePrivateKey("ES384");

  expect(es256Key.alg).toBe("ES256");
  expect(es384Key.alg).toBe("ES384");
  expect(es256Key.crv).toBe("P-256");
  expect(es384Key.crv).toBe("P-384");
  expect(es256Key.kid).not.toBe(es384Key.kid);
});

test("key generation produces unique keys", async () => {
  const key1 = await key.generatePrivateKey("ES256");
  const key2 = await key.generatePrivateKey("ES256");

  expect(key1.kid).not.toBe(key2.kid);
  expect(key1.d).not.toBe(key2.d);
  expect(key1.x).not.toBe(key2.x);
  expect(key1.y).not.toBe(key2.y);
});