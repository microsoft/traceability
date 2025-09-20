import { test, expect } from "bun:test";

import { key } from "../src";
import type { PublicKeyJwk, PublicKey } from "../src/types";

test("generate and export", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  expect(privateKey.kty).toBe("EC");
  expect(publicKey.kty).toBe("EC");
  expect(privateKey.alg).toBe("ES256");
  expect(publicKey.alg).toBe("ES256");
})

test("sign and verify", async () => {
  const privateKey = await key.generatePrivateKey("ES256");
  const publicKey = await key.exportPublicKey(privateKey);
  const signer = await key.signer(privateKey);
  const verifier = await key.verifier(publicKey);
  const signature = await signer.sign(new TextEncoder().encode("Hello, world!"));
  const verified = await verifier.verify(new TextEncoder().encode("Hello, world!"), signature);
  expect(verified).toBe(true);
})

test("calculate thumbprint", async () => {
  const thumbprint = await key.calculateThumbprint({
    kty: 'EC',
    crv: 'P-256',
    alg: 'ES256',
    x: 'jJ6Flys3zK9jUhnOHf6G49Dyp5hah6CNP84-gY-n9eo',
    y: 'nhI6iD5eFXgBTLt_1p3aip-5VbZeMhxeFSpjfEAf7Ww',
    key_ops: ['verify'],
  } as PublicKey);
  expect(thumbprint).toBe("w9eYdC6_s_tLQ8lH6PUpc0mddazaqtPgeC2IgWDiqY8");
})