import { test, expect, describe } from "bun:test";
import { presentation } from "../src/index";

describe("Presentation Verification Timing", () => {

  test("should create presentation with historical issuance time", async () => {
    // Test scenario: Sign presentation at historical time
    const historicalIssuanceTime = new Date("2024-01-15T10:30:00.000Z");

    // Generate a fresh ES256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable
      ["sign", "verify"]
    );

    // Export the private key to JWK format
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Add required properties for our signer
    const holderKey = {
      ...privateKeyJwk,
      alg: "ES256",
      kid: "test-holder-key"
    };

    // Create simple presentation without credentials (to focus on timing)
    const testPresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      "type": ["VerifiablePresentation"],
      "holder": "https://test-holder.example"
    };

    // Sign presentation with historical issuance time
    const presSigner = await presentation.signer(holderKey);
    const signedPresentationJWT = await presSigner.sign(testPresentation, {
      issuanceTime: historicalIssuanceTime
    });

    // Verify presentation JWT claims
    const parts = signedPresentationJWT.split('.');
    const payload = JSON.parse(atob(parts[1]));

    expect(payload.iat).toBe(Math.floor(historicalIssuanceTime.getTime() / 1000));
    expect(payload.exp).toBe(payload.iat + 3600); // 1 hour expiration

    const expectedExpiration = new Date(payload.exp * 1000);
    console.log(`✓ Presentation iat: ${new Date(payload.iat * 1000).toISOString()}`);
    console.log(`✓ Presentation exp: ${expectedExpiration.toISOString()}`);
    console.log(`✓ Historical issuance time override works correctly`);

    // Verify claims match expected historical time
    expect(new Date(payload.iat * 1000)).toEqual(historicalIssuanceTime);
  });

  test("should use current time when no issuanceTime provided", async () => {
    // Generate a fresh ES256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true, // extractable
      ["sign", "verify"]
    );

    // Export the private key to JWK format
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Add required properties for our signer
    const holderKey = {
      ...privateKeyJwk,
      alg: "ES256",
      kid: "test-holder-key-2"
    };

    const testPresentation = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      "type": ["VerifiablePresentation"],
      "holder": "https://test-holder2.example"
    };

    const beforeSign = new Date();

    // Sign with current time (no issuanceTime override)
    const presSigner = await presentation.signer(holderKey);
    const signedPresentationJWT = await presSigner.sign(testPresentation);

    const afterSign = new Date();

    // Verify presentation JWT claims
    const parts = signedPresentationJWT.split('.');
    const payload = JSON.parse(atob(parts[1]));

    const iatTime = new Date(payload.iat * 1000);

    // Should be within a reasonable range of current time
    expect(iatTime.getTime()).toBeGreaterThanOrEqual(beforeSign.getTime() - 1000); // 1 second tolerance
    expect(iatTime.getTime()).toBeLessThanOrEqual(afterSign.getTime() + 1000); // 1 second tolerance

    console.log(`✓ Current time issuance works correctly`);
    console.log(`✓ iat: ${iatTime.toISOString()}`);
  });

});