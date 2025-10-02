
import { base64url } from "../encoding";
import type { ES256, ES384, PrivateKey, PrivateKeyJwk, PublicKey, PublicKeyJwk } from "../types";

export const fullySpecifiedAlgorithms = {
  ES256: {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256"
  },
  ES384: {
    name: "ECDSA",
    namedCurve: "P-384",
    hash: "SHA-384"
  }
};

async function generateKeyForAlgorithm(algorithm: ES256 | ES384) {
  return await crypto.subtle.generateKey(
    {
      name: fullySpecifiedAlgorithms[algorithm].name,
      namedCurve: fullySpecifiedAlgorithms[algorithm].namedCurve
    },
    true, // exportable, be careful not to leak private keys
    ["sign", "verify"]
  );
}

// https://www.rfc-editor.org/rfc/rfc7638.txt
export async function calculateThumbprint(publicKey: PublicKey): Promise<string> {
  if (publicKey.kty !== "EC") {
    throw new Error("Thumbprint calculation is only supported for EC keys");
  }
  const serializedKey = `{"crv":"${publicKey.crv}","kty":"${publicKey.kty}","x":"${publicKey.x}","y":"${publicKey.y}"}`;
  const toBeHashed = new TextEncoder().encode(serializedKey);
  const thumbprint = await crypto.subtle.digest("SHA-256", toBeHashed);
  return base64url.encode(new Uint8Array(thumbprint));
}     

export async function generatePrivateKey(algorithm: ES256 | ES384): Promise<PrivateKey> {
  const keyPair = await generateKeyForAlgorithm(algorithm);
  const exportedPrivateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const exportedPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const thumbprint = await calculateThumbprint(exportedPublicKey as PublicKey);
  return {
    kid: thumbprint,
    kty: exportedPrivateKey.kty,
    crv: exportedPrivateKey.crv,
    alg: algorithm,
    x: exportedPublicKey.x, // Use public key coordinates
    y: exportedPublicKey.y, // Use public key coordinates
    d: exportedPrivateKey.d,
    key_ops: ["sign"]
  } as PrivateKey;
}

export async function exportPublicKey(privateKey: PrivateKey): Promise<PublicKey> {
  return {
    kid: privateKey.kid, // Use the same kid as the private key
    kty: privateKey.kty,
    crv: privateKey.crv,
    alg: privateKey.alg,
    x: privateKey.x,
    y: privateKey.y,
    key_ops: ['verify'] as ['verify']
  } as PublicKey;
}
