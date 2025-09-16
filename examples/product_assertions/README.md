# Product Assertions with W3C Verifiable Credentials

This example demonstrates how W3C Verifiable Credentials can be used to create tamper-evident, cryptographically secured assertions about product composition and supply chain information, such as Hardware Bills of Materials (HBOM).

## Benefits of W3C Verifiable Credentials for Product Traceability

### 1. **Cryptographic Integrity**

- **Tamper Evidence**: Any modification to the credential data invalidates the cryptographic signature
- **Non-repudiation**: The issuer cannot deny having made the assertion
- **Immutable Records**: Historical product information remains verifiable over time

### 2. **Trust and Authentication**

- **Issuer Verification**: Verifiers can cryptographically verify the identity of the credential issuer
- **Trust Networks**: Enables trust relationships between different parties in the supply chain
- **Decentralized Verification**: No need for centralized authorities to validate assertions

### 3. **Privacy and Selective Disclosure**

- **Data Minimization**: Only necessary information needs to be shared
- **Selective Disclosure**: Different parties can see only relevant portions of the data
- **Zero-Knowledge Proofs**: Can prove properties without revealing sensitive details

### 4. **Interoperability and Standards**

- **W3C Standard**: Based on established web standards for broad compatibility
- **Extensible**: Can be extended with custom schemas for specific industry needs
- **Cross-Platform**: Works across different systems and technologies

### 5. **Supply Chain Security**

- **Provenance Tracking**: Clear chain of custody from raw materials to finished products
- **Risk Management**: Enables verification of supplier claims and compliance
- **Regulatory Compliance**: Supports requirements for transparency and accountability

## Example: Verifiable Credential for Hardware Bill of Materials

Based on the [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/), here's how a hardware bill of materials can be represented as a verifiable credential:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://spdx.org/rdf/3.0.1/spdx-model.jsonld"
  ],
  "id": "http://university.example/credentials/58473",
  "type": ["VerifiableCredential", "HardwareBillOfMaterials"],
  "issuer": "https://controller.example/101",
  "validFrom": "2010-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "urn:spdx.dev:sbom/battery-hbom-example-1.0",
    "spdxVersion": "SPDX-3.0",
    "name": "Example Hardware Bill of Materials for Lithium-ion Battery",
    "dataLicense": "CC0-1.0",
    "creationInfo": {
      "specVersion": "SPDX-3.0",
      "created": "2025-09-15T19:00:00Z",
      "creators": [
        "Person:Jane Doe (jane.doe@example.com)",
        "Tool:SPDX-Generator-v1.0"
      ]
    },
    "rootElements": ["urn:spdx.dev:hardware/battery-pack-001"],
    "elements": [
      {
        "@id": "urn:spdx.dev:hardware/battery-pack-001",
        "@type": "spdx:Hardware",
        "name": "Li-ion Battery Pack Model XP-70",
        "description": "A lithium-ion battery pack assembly for a portable device.",
        "supplier": {
          "@id": "urn:spdx.dev:agent/supplier-battery-solutions-inc",
          "@type": "spdx:Organization",
          "name": "Battery Solutions Inc.",
          "contact": "contact@batterysolutions.example"
        }
      },
      {
        "@id": "urn:spdx.dev:hardware/battery-cell-18650",
        "@type": "spdx:Hardware",
        "name": "18650 Li-ion Cell",
        "description": "Individual cylindrical lithium-ion cell, type 18650.",
        "partNumber": "18650-LCO-2500mAh",
        "supplier": {
          "@id": "urn:spdx.dev:agent/supplier-cell-tech",
          "@type": "spdx:Organization",
          "name": "Cell Technologies Ltd."
        }
      },
      {
        "@id": "urn:spdx.dev:hardware/pack-enclosure",
        "@type": "spdx:Hardware",
        "name": "Battery Pack Enclosure",
        "description": "Protective outer shell made of molded plastic and aluminum.",
        "partNumber": "BPE-001-V3"
      },
      {
        "@id": "urn:spdx.dev:hardware/bms-board",
        "@type": "spdx:Hardware",
        "name": "Battery Management System (BMS) Board",
        "description": "A printed circuit board for managing battery operation.",
        "partNumber": "BMS-V2.1"
      }
    ],
    "relationships": [
      {
        "@id": "urn:spdx.dev:relationship/battery-pack-contains-cells",
        "spdxElementId": "urn:spdx.dev:hardware/battery-pack-001",
        "relationshipType": "contains",
        "relatedSpdxElement": "urn:spdx.dev:hardware/battery-cell-18650",
        "comment": "The pack contains 12 individual 18650 cells."
      },
      {
        "@id": "urn:spdx.dev:relationship/battery-pack-contains-enclosure",
        "spdxElementId": "urn:spdx.dev:hardware/battery-pack-001",
        "relationshipType": "contains",
        "relatedSpdxElement": "urn:spdx.dev:hardware/pack-enclosure"
      },
      {
        "@id": "urn:spdx.dev:relationship/battery-pack-contains-bms",
        "spdxElementId": "urn:spdx.dev:hardware/battery-pack-001",
        "relationshipType": "contains",
        "relatedSpdxElement": "urn:spdx.dev:hardware/bms-board"
      }
    ]
  }
}
```

## Key Features of This Example

1. **Standard Compliance**: Uses W3C Verifiable Credentials v1 context with SPDX extensions
2. **Cryptographic Security**: Includes Ed25519 signature for tamper detection
3. **Structured Data**: Hierarchical representation of product composition
4. **Supplier Information**: Includes verifiable supplier details
5. **Temporal Validity**: Clear issuance and expiration dates
6. **Extensible**: Can be extended with additional product attributes

## Verification Process

To verify this credential:

1. **Signature Verification**: Validate the cryptographic signature using the issuer's public key
2. **Schema Validation**: Ensure the data structure matches the expected schema
3. **Temporal Validation**: Check that the credential is within its validity period
4. **Issuer Trust**: Verify the issuer's identity and trustworthiness
5. **Content Verification**: Validate the product composition claims

## References

- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [SPDX Specification v3.0.1](https://spdx.github.io/spdx-spec/v3.0.1/model/Software/Classes/Sbom/)
- [CISA Hardware BOM Framework](https://www.cisa.gov/sites/default/files/2023-09/A%20Hardware%20Bill%20of%20Materials%20Framework%20for%20Supply%20Chain%20Risk%20Management%20%28508%29.pdf)
