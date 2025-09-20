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

## Initial Investigation - Entity Analysis

As the first step in our digital forensic investigation, we need to catalog all entities involved in the supply chain and their controller identifiers. This gives us a baseline for verifying the authenticity of digital signatures on supply chain documents.

### Supply Chain Entities

| Entity Name | Type | Controller Identifier | Base Location | Country/Territory | Role | Status |
|-------------|------|-----------------------|---------------|-------------------|------|---------|
| Chompchomp Ltd | Seafood Importer | `https://chompchomp.example/entity/bvi-001` | Road Town, Tortola | British Virgin Islands | Buyer/Importer | Legitimate |
| Camarón Corriente S.A. | Seafood Distributor | `https://camaron-corriente.example/entity/ve-pbc-001` | Puerto Cabello | Venezuela | Seller/Exporter | Legitimate |
| Cargo Line Ltd | Carrier | `https://cargo-line.example/entity/pr-sju-001` | San Juan | Puerto Rico | Primary Carrier | Legitimate (fleet repairs) |
| Shady Carrier Ltd | Carrier | `https://shady-carrier.example/entity/aw-oru-001` | Oranjestad | Aruba | Substitute Carrier | **Fraudulent** |
| Shady Distributor Ltd | Seafood Distributor | `https://shady-distributor.example/entity/bvi-002` | Road Town, Tortola | British Virgin Islands | Intermediary | **Fraudulent** |
| Legit Shrimp Ltd | Seafood Supplier | `https://legit-shrimp.example/entity/tt-pos-001` | Port of Spain | Trinidad and Tobago | Original Supplier (forged) | Legitimate (identity stolen) |
| Anonymous Distributor | Seafood Distributor | `https://anonymous-distributor.example/entity/vi-stt-001` | Charlotte Amalie, St. Thomas | U.S. Virgin Islands | Final Buyer | Legitimate (victim) |

### Geographic Coordinates

| Entity | Coordinates | Location Notes |
|--------|-------------|----------------|
| Chompchomp Ltd | `[-64.6208, 18.4167]` | Road Town, Tortola, BVI |
| Camarón Corriente S.A. | `[-68.0125, 10.4647]` | Puerto Cabello, Venezuela |
| Cargo Line Ltd | `[-66.1057, 18.4655]` | San Juan, Puerto Rico |
| Shady Carrier Ltd | `[-70.0270, 12.5186]` | Oranjestad, Aruba |
| Shady Distributor Ltd | `[-64.6208, 18.4167]` | Road Town, Tortola, BVI |
| Legit Shrimp Ltd | `[-61.5167, 10.6596]` | Port of Spain, Trinidad and Tobago |
| Anonymous Distributor | `[-64.9307, 18.3419]` | Charlotte Amalie, St. Thomas, USVI |

### Transaction Flow Analysis

1. **Chompchomp Ltd** → Purchase Order → **Camarón Corriente S.A.**
2. **Camarón Corriente S.A.** → Commercial Invoice → **Chompchomp Ltd**
3. **Camarón Corriente S.A.** → Goods → **Shady Carrier Ltd** (substitute for Cargo Line Ltd)
4. **Shady Carrier Ltd** → Forged Documentation + Partial Goods → **Chompchomp Ltd**
5. **Shady Carrier Ltd** → Stolen Goods → **Shady Distributor Ltd**
6. **Shady Distributor Ltd** → Forged Certificates (claiming Legit Shrimp Ltd origin) → **Anonymous Distributor**
7. **Anonymous Distributor** → Customs Filing (HS Code 0306.17, Trinidad & Tobago origin)
8. **Lab Tests** → Chemical Contamination Detected → **Investigation Launched**

### Key Fraud Activities Identified

- **Document Forgery**: Shady Carrier Ltd forged transit documentation
- **Cargo Theft**: Partial shipment diverted and sold
- **Identity Theft**: Shady Distributor Ltd forged Legit Shrimp Ltd certificates
- **False Origin**: Final goods mislabeled as Trinidad & Tobago origin
- **Chain of Custody Break**: Legitimate supply chain compromised at carrier level

### Digital Forensics Approach

Our investigation will focus on verifying digital signatures to reveal:
1. Where the chain of custody was broken
2. Which documents were forged vs. legitimate
3. The true origin and route of the contaminated shrimp
4. Evidence of the fraud scheme involving both Shady entities

The controller identifier patterns follow a forensically advantageous structure:
- **Domain-based**: Each entity has a unique domain following the pattern `{entity-name}.example`
- **Path-based**: Entity identifiers follow `/entity/{country-code}-{location-code}-{sequence}`
- **Geographic encoding**: Location codes reference primary business locations
- **Forensic advantage**: Legitimate controllers should have valid cryptographic signatures, while forged documents from fraudulent entities will fail verification

Now let's walk through the digital evidence step by step.