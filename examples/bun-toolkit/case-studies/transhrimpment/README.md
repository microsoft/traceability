# Transhrimpment

In this hypothetical scenario, we explore a location and route based analysis of transhipped and relabelled frozen shrimp product.
This scenario helps us explore some of the key features of verifiable supply chains in the context of a cold chain.
Many of the techniques we will use for this scenario are applicable for pharmaceuticals and other cold chain products.
These techniques can also be applied to microelectronics supply chains.

In our scenario, we have a small seafood importer called `Chompchomp Ltd` based in `Road Town, Tortola, British Virgin Islands`.
`Chompchomp Ltd` has just signed a new contract with a small seafood distributor called `Camarón Corriente S.A.` based in `Puerto Cabello, Venezuela`.

Lets say `Chompchomp Ltd` submits a purchase order to `Camarón Corriente S.A.` for 1000kg of frozen shrimp, and after some time `Camarón Corriente S.A.` sends a commercial invoice to `Chompchomp Ltd`.

`Camarón Corriente S.A.`'s usual carrier is `Cargo Line Ltd` based out of `San Juan, Puerto Rico`, but due to a recent hurricane they have been forced to make repairs to their fleet, and are currently unable to deliver the goods.

`Camarón Corriente S.A.` scrambled to find a new carrier, and rushes their normal vetting process for an organization called `Shady Carrier Ltd` based out of `Oranjestad, Aruba`.


`Shady Carrier Ltd` quickly delivers the goods but forges critical supply chain documentation to make it appear that part of the frozen shrimp was destroyed during transit.

`Shady Carrier Ltd` then sells the goods to another small seafood distributor called `Shady Distributor Ltd` who is also based in `Road Town, Tortola, British Virgin Islands`.

`Shady Distributor Ltd` forges fresh certifcates of origin that say the frozen shrimp was sourced from a legitimate supplier called `Legit Shrimp Ltd` based out of `Port of Spain, Trinidad and Tobago`.

A seafood distributor in `Charlotte Amalie, St. Thomas, U.S. Virgin Islands` places an order for 500kg of frozen shrimp from `Shady Distributor Ltd`, who happens to use `Cargo Line Ltd`, and after their repairs to their fleet, the carrier is able to deliver the goods.


The importer's customs broker files all the paper work for the imported shrimp as hs code 0306.17, originating from `Trinidad and Tobago`.
Lab tests on the shrimp reveal chemical contamination, and an investigation is launched.

You are an an auditor called in to help with the investigation.

In this scenario, all the supply chain paperwork was also digitally protected, and by verifying the digital sigantures, you are able to uncover the fraud.

## Scenario Overview

A seafood importer discovers fraud in their supply chain when contaminated shrimp products are traced back through forged documentation. 
The investigation reveals a complex web of document forgery, cargo theft, and identity theft that spans multiple countries and jurisdictions.

### Phase 1: Legitimate Transaction Setup
1. **Chompchomp Ltd** (BVI) signs contract with **Camarón Corriente S.A.** (Venezuela)
2. **Chompchomp Ltd** submits purchase order for 1000kg frozen shrimp
3. **Camarón Corriente S.A.** sends commercial invoice

### Phase 2: Carrier Substitution Due to Emergency
4. **Cargo Line Ltd** (Puerto Rico) suffers hurricane damage, fleet unavailable
5. **Camarón Corriente S.A.** rushes vetting process for **Shady Carrier Ltd** (Aruba)

### Phase 3: Fraud Execution
6. **Shady Carrier Ltd** delivers goods but forges documentation claiming 200kg "lost in transit"
7. **Shady Carrier Ltd** diverts stolen goods to **Shady Distributor Ltd** (BVI)
8. **Shady Distributor Ltd** forges certificates claiming **Legit Shrimp Ltd** (Trinidad) origin

### Phase 4: Secondary Market Distribution
9. **Anonymous Distributor** (U.S. Virgin Islands) orders 500kg from **Shady Distributor Ltd**
10. **Cargo Line Ltd** (now repaired) delivers the fraudulent goods
11. Customs broker files paperwork as HS Code 0306.17, Trinidad & Tobago origin

### Phase 5: Discovery and Investigation
12. Lab tests reveal chemical contamination
13. Investigation launched - **You are the auditor**


## Supply Chain Entities

| Name | Address | Controller | Role | Status |
|-------------|---------|---------------|------|---------|
| **Chompchomp Ltd** | Road Town, Tortola, British Virgin Islands | `https://chompchomp.example/entity/bvi-001` | Seafood Importer / Buyer | ✅ Legitimate |
| **Camarón Corriente S.A.** | Puerto Cabello, Venezuela | `https://camaron-corriente.example/entity/ve-pbc-001` | Seafood Distributor / Seller | ✅ Legitimate |
| **Cargo Line Ltd** | San Juan, Puerto Rico | `https://cargo-line.example/entity/pr-sju-001` | Carrier / Primary | ✅ Legitimate (fleet repairs) |
| **Shady Carrier Ltd** | Oranjestad, Aruba | `https://shady-carrier.example/entity/aw-oru-001` | Carrier / Substitute | 🚨 **Fraudulent** |
| **Shady Distributor Ltd** | Road Town, Tortola, British Virgin Islands | `https://shady-distributor.example/entity/bvi-002` | Seafood Distributor / Intermediary | 🚨 **Fraudulent** |
| **Legit Shrimp Ltd** | Port of Spain, Trinidad and Tobago | `https://legit-shrimp.example/entity/tt-pos-001` | Seafood Supplier / Original | ✅ Legitimate (identity stolen) |
| **Anonymous Distributor** | Charlotte Amalie, St. Thomas, U.S. Virgin Islands | `https://anonymous-distributor.example/entity/vi-stt-001` | Seafood Distributor / Final Buyer | ✅ Legitimate (victim) |

## Supply Chain Documents

| Document | Schema | From (Issuer) | To (Holder) | Status |
|---------------|--------|---------------|-------------|---------|
| **Purchase Order** | `purchase-order-credential.yaml` | `https://chompchomp.example/entity/bvi-001` | `https://camaron-corriente.example/entity/ve-pbc-001` | ✅ Legitimate |
| **Commercial Invoice** | `commercial-invoice-credential.yaml` | `https://camaron-corriente.example/entity/ve-pbc-001` | `https://chompchomp.example/entity/bvi-001` | ✅ Legitimate |
| **Bill of Lading** | `bill-of-lading-credential.yaml` | `https://shady-carrier.example/entity/aw-oru-001` | `https://chompchomp.example/entity/bvi-001` | ⚠️ **Suspicious** (quantity discrepancy) |
| **Certificate of Origin** | `certificate-of-origin-credential.yaml` | `https://legit-shrimp.example/entity/tt-pos-001` (forged) | `https://shady-distributor.example/entity/bvi-002` | 🚨 **Fraudulent** (forged signature) |

## Fraud Indicators

| Indicator | Description | Evidence |
|-----------|-------------|----------|
| **Quantity Discrepancy** | Bill of Lading shows 1000kg → 800kg | 200kg claimed "lost in transit" |
| **Forged Signatures** | Certificate of Origin | Shady Distributor impersonating Legit Shrimp |
| **Geographic Inconsistency** | Goods claimed from Trinidad | Actually originated from Venezuela |
| **Chain of Custody Break** | Legitimate carrier bypassed | Shady Carrier substituted without proper vetting |

## Investigation Approach

As the auditor, you have access to digitally protected supply chain paperwork. By verifying digital signatures and analyzing the document trail, you can:

1. **Verify Entity Identities**: Cross-reference controller identifiers with known legitimate entities
2. **Validate Document Signatures**: Check cryptographic signatures against entity public keys
3. **Trace Geographic Claims**: Verify location claims against actual shipping routes
4. **Identify Anomalies**: Flag quantity discrepancies and suspicious timing

This case study demonstrates how verifiable credentials with cryptographic proof provide robust protection against supply chain fraud through digital forensics and geographic traceability.

