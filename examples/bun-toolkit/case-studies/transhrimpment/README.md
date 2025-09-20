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

## CLI Workflow for Digital Investigation

This section demonstrates how to use the generic verifiable credentials CLI to investigate the Transhrimpment case study. All commands use the CLI located in `src/cli.ts`.

### Step 1: Schema Validation

First, validate all credential schemas to ensure they're properly formatted:

```bash
# Validate all schemas
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/purchase-order-credential.yaml
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/commercial-invoice-credential.yaml
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/certificate-of-origin-credential.yaml
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/bill-of-lading-credential.yaml
```

### Step 2: Generate Public Controller Documents

⚠️ **IMPORTANT**: Entity configurations in `/entity_configurations/` contain **PRIVATE KEYS** and are highly sensitive. Controller documents are **PUBLIC** documents derived from these configurations.

Generate public controller documents from private entity configurations:

```bash
# Generate PUBLIC controllers from PRIVATE entity configurations
# These controller documents contain only public keys and can be shared publicly

bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/chompchomp.json --out case-studies/transhrimpment/controllers/chompchomp-controller.json

bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/camaron-corriente.json --out case-studies/transhrimpment/controllers/camaron-corriente-controller.json

bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/legit-shrimp.json --out case-studies/transhrimpment/controllers/legit-shrimp-controller.json

# Generate controllers for fraudulent entities (they have legitimate keys but commit fraud)
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/shady-carrier.json --out case-studies/transhrimpment/controllers/shady-carrier-controller.json

bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/shady-distributor.json --out case-studies/transhrimpment/controllers/shady-distributor-controller.json
```

🔒 **Security Note**: The entity configuration files (chompchomp.json, etc.) contain private keys and should be treated as highly sensitive. In a real scenario, these would be stored securely and never shared. Only the generated controller documents contain public information.

### Step 3: Sign Supply Chain Credentials

Following the timeline of the fraud, sign each credential with the appropriate entity's keys:

#### 3.1 Purchase Order (Chompchomp → Camarón Corriente)
```bash
# Extract PUBLIC key from PRIVATE entity configuration for verification
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/chompchomp.json --out case-studies/transhrimpment/keys/chompchomp-public.json

# Sign using PRIVATE entity configuration
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/chompchomp.json --cred case-studies/transhrimpment/credentials/purchase-order.json --out case-studies/transhrimpment/signed/purchase-order-signed.json
```

#### 3.2 Commercial Invoice (Camarón Corriente → Chompchomp)
```bash
# Extract PUBLIC key from PRIVATE entity configuration
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/camaron-corriente.json --out case-studies/transhrimpment/keys/camaron-corriente-public.json

# Sign using PRIVATE entity configuration
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/camaron-corriente.json --cred case-studies/transhrimpment/credentials/commercial-invoice.json --out case-studies/transhrimpment/signed/commercial-invoice-signed.json
```

#### 3.3 Bill of Lading (Shady Carrier - FRAUDULENT)
```bash
# Extract PUBLIC key from PRIVATE entity configuration
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/shady-carrier.json --out case-studies/transhrimpment/keys/shady-carrier-public.json

# Sign fraudulent bill of lading using Shady Carrier's PRIVATE keys (with forged cargo quantities)
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/shady-carrier.json --cred case-studies/transhrimpment/credentials/bill-of-lading.json --out case-studies/transhrimpment/signed/bill-of-lading-signed.json
```

#### 3.4 Certificate of Origin (Shady Distributor forging Legit Shrimp identity)
```bash
# Extract Legit Shrimp's PUBLIC key (the entity being impersonated)
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/legit-shrimp.json --out case-studies/transhrimpment/keys/legit-shrimp-public.json

# FRAUD: Shady Distributor uses their own PRIVATE keys but claims to be Legit Shrimp
# This will create a valid signature from Shady Distributor, but verification will fail
# when we try to verify it against Legit Shrimp's PUBLIC key
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/shady-distributor.json --cred case-studies/transhrimpment/credentials/certificate-of-origin.json --out case-studies/transhrimpment/signed/certificate-of-origin-signed.json
```

🔒 **Key Security Note**:
- **PRIVATE entity configurations** (entity_configurations/*.json) are used for signing - these contain sensitive private keys
- **PUBLIC keys** (keys/*-public.json) are extracted for verification only
- **PUBLIC controller documents** (controllers/*-controller.json) contain only public information

### Step 4: Create Supply Chain Presentation

Compile all signed credentials into a presentation for investigation:

```bash
# Note: This would be done by the investigator using their PRIVATE entity configuration
# The investigator creates a presentation containing all the supply chain evidence
bun src/cli.ts sign-presentation --key case-studies/transhrimpment/entity_configurations/final-consumer.json --pres case-studies/transhrimpment/presentations/supply-chain-presentation.json --out case-studies/transhrimpment/signed/supply-chain-presentation-signed.json
```

### Step 5: Verification and Fraud Detection

Verify each credential to detect the fraud:

#### 5.1 Verify Legitimate Credentials
```bash
# Verify purchase order using Chompchomp's PUBLIC key (should pass)
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/purchase-order-signed.json --key case-studies/transhrimpment/keys/chompchomp-public.json

# Verify commercial invoice using Camarón Corriente's PUBLIC key (should pass)
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/commercial-invoice-signed.json --key case-studies/transhrimpment/keys/camaron-corriente-public.json
```

#### 5.2 Detect Fraudulent Credentials
```bash
# Verify bill of lading using Shady Carrier's PUBLIC key
# (signature will pass, but quantities reveal fraud: 800kg vs 1000kg)
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/bill-of-lading-signed.json --key case-studies/transhrimpment/keys/shady-carrier-public.json

# FRAUD DETECTION: Verify certificate of origin using Legit Shrimp's PUBLIC key
# This SHOULD FAIL because document was signed by Shady Distributor, not Legit Shrimp
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/certificate-of-origin-signed.json --key case-studies/transhrimpment/keys/legit-shrimp-public.json
```

#### 5.3 Full Presentation Verification
```bash
# Verify complete presentation using resolver (maps entity IDs to PUBLIC controller documents)
bun src/cli.ts verify-presentation --pres case-studies/transhrimpment/signed/supply-chain-presentation-signed.json --resolver case-studies/transhrimpment/resolver.json
```

💡 **Verification Process**:
- Signed credentials are verified using **PUBLIC keys** only
- **PRIVATE keys** are never shared and only used for signing
- The resolver maps entity identifiers to **PUBLIC controller documents** (not private configs)

### Step 6: Analysis Results

The CLI investigation reveals:

1. **Quantity Discrepancy**: Commercial Invoice shows 1000kg, but Bill of Lading reports 800kg with "200kg destroyed" - evidence of theft
2. **Signature Mismatch**: Certificate of Origin claims to be from Legit Shrimp Ltd but signature verification fails
3. **Route Analysis**: GeoJSON coordinates show suspicious route through Aruba (Shady Carrier location)
4. **Chain of Custody Break**: Digital signatures reveal where legitimate supply chain was compromised

### Investigation Conclusion

The digital forensics workflow using verifiable credentials successfully:
- Identified the exact point where the supply chain was compromised (at carrier level)
- Revealed forged documentation through signature verification failures
- Quantified the theft (200kg diverted)
- Traced the fraudulent goods through geographic route analysis
- Provided cryptographic proof of fraud for legal proceedings

This demonstrates how verifiable supply chains with digital signatures can detect and prove fraud that would be difficult to uncover with traditional paper-based documentation.

## File Structure

```
case-studies/transhrimpment/
├── README.md                          # This file
├── entity_configurations/             # 🔒 PRIVATE entity configurations (contains PRIVATE KEYS!)
│   ├── chompchomp.json               #    ⚠️ SENSITIVE: Private keys for signing
│   ├── camaron-corriente.json        #    ⚠️ SENSITIVE: Private keys for signing
│   ├── legit-shrimp.json            #    ⚠️ SENSITIVE: Private keys for signing
│   ├── shady-carrier.json           #    ⚠️ SENSITIVE: Private keys for signing
│   ├── shady-distributor.json       #    ⚠️ SENSITIVE: Private keys for signing
│   ├── final-consumer.json          #    ⚠️ SENSITIVE: Private keys for signing
│   └── transit-authority.json       #    ⚠️ SENSITIVE: Private keys for signing
├── schemas/                           # Credential schemas (public)
│   ├── purchase-order-credential.yaml
│   ├── commercial-invoice-credential.yaml
│   ├── certificate-of-origin-credential.yaml
│   └── bill-of-lading-credential.yaml
├── credentials/                       # Unsigned credential templates (public)
│   ├── purchase-order.json
│   ├── commercial-invoice.json
│   ├── certificate-of-origin.json
│   └── bill-of-lading.json
├── presentations/                     # Presentation templates (public)
│   └── supply-chain-presentation.json
├── signed/                           # Generated signed documents (public)
│   └── (created by CLI commands)
├── controllers/                      # 🌐 PUBLIC controller documents (generated from configs)
│   └── (created by CLI commands)    #    ✅ SAFE: Only contains public keys
├── keys/                            # 🌐 PUBLIC keys extracted for verification
│   └── (created by CLI commands)    #    ✅ SAFE: Only public keys
├── resolver.json                    # Entity resolver (maps to PUBLIC controllers)
└── demo.sh                          # Demonstration script
```

### 🔐 Security Classification:

**🔒 PRIVATE/SENSITIVE** (never share):
- `/entity_configurations/` - Contains private keys for signing
- Must be stored securely in production

**🌐 PUBLIC** (safe to share):
- `/controllers/` - Generated public controller documents
- `/keys/` - Extracted public keys
- `/signed/` - Signed credentials (contain only public signatures)
- `/schemas/`, `/credentials/`, `/presentations/` - Templates and schemas
- `resolver.json` - Maps to public controller documents only