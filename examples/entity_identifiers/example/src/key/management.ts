
import { base64url } from "../encoding";
import type { ES256, PrivateKeyJwk, PublicKeyJwk } from "../types";

export const fullySpecifiedAlgorithms = {
  ES256: {
    name: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256"
  }
};

async function generateKeyForAlgorithm(algorithm: ES256) {
  return await crypto.subtle.generateKey(
    {
      name: fullySpecifiedAlgorithms[algorithm].name,
      namedCurve: fullySpecifiedAlgorithms[algorithm].namedCurve
    },
    true, // exportable, be careful not to leak private keys
    ["sign", "verify"]
  );
}

export async function generatePrivateKey(algorithm: ES256): Promise<PrivateKeyJwk> {
  const keyPair = await generateKeyForAlgorithm(algorithm);
  const exportedKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  exportedKey.alg = algorithm;
  return {
    kty: exportedKey.kty,
    crv: exportedKey.crv,
    alg: exportedKey.alg,
    x: exportedKey.x,
    y: exportedKey.y,
    d: exportedKey.d,
    key_ops: ["sign"]
  } as PrivateKeyJwk;
}

export async function exportPublicKey(privateKey: PrivateKeyJwk): Promise<PublicKeyJwk> {
  const publicKeyInfo = {
    kty: privateKey.kty,
    crv: privateKey.crv,
    alg: privateKey.alg,
    x: privateKey.x,
    y: privateKey.y,
    key_opts: ['verify'] as ['verify']
  }
  // ensure the public key is well formed
  const exportedKey = await crypto.subtle.exportKey("jwk", await crypto.subtle.importKey("jwk", publicKeyInfo, {
    name: fullySpecifiedAlgorithms[publicKeyInfo.alg].name,
    namedCurve: fullySpecifiedAlgorithms[publicKeyInfo.alg].namedCurve
  }, true, publicKeyInfo.key_opts));
  return {
    kty: exportedKey.kty,
    crv: exportedKey.crv,
    alg: publicKeyInfo.alg,
    x: exportedKey.x,
    y: exportedKey.y,
    key_ops: publicKeyInfo.key_opts
  } as PublicKeyJwk;
}

// https://www.rfc-editor.org/rfc/rfc7638.txt
export async function calculateThumbprint(publicKeyJwk: PublicKeyJwk): Promise<string> {
  if (publicKeyJwk.kty !== "EC") {
    throw new Error("Thumbprint calculation is only supported for EC keys");
  }
  const serializedKey = `{"crv":"${publicKeyJwk.crv}","kty":"${publicKeyJwk.kty}","x":"${publicKeyJwk.x}","y":"${publicKeyJwk.y}"}`;
  const toBeHashed = new TextEncoder().encode(serializedKey);
  const thumbprint = await crypto.subtle.digest("SHA-256", toBeHashed);
  return base64url.encode(new Uint8Array(thumbprint));
}     