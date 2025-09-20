# Transhrimpment: Supply Chain Fraud Investigation Case Study

A comprehensive demonstration of supply chain fraud detection using verifiable credentials with CNF claims and GeoJSON geographic analysis.

## Case Overview

This case study demonstrates how a fraudulent shrimp import operation ("Transhrimpment") can be detected using verifiable credentials with cryptographic proof and geographic tracking. The fraud involves quantity manipulation and identity theft across multiple jurisdictions.

## Entities Involved

### Legitimate Parties
- **Chompchomp Ltd** (BVI) - Seafood importer and buyer
- **Camarón Corriente S.A.** (Venezuela) - Shrimp supplier
- **Legit Shrimp Ltd** (Trinidad & Tobago) - Original certificate holder

### Fraudulent Parties
- **Shady Carrier Ltd** (Aruba) - Transport company manipulating quantities
- **Shady Distributor Ltd** (BVI) - Identity thief forging certificates

## Credential Types

| Credential Type | Schema | Issuer | Holder |
|---|---|---|---|
| **PurchaseOrderCredential** | `schemas/purchase-order-credential.yaml` | Chompchomp Ltd (`https://chompchomp.example/entity/bvi-001`) | Chompchomp Ltd (`https://chompchomp.example/entity/bvi-001`) |
| **CommercialInvoiceCredential** | `schemas/commercial-invoice-credential.yaml` | Camarón Corriente S.A. (`https://camaron-corriente.example/entity/ve-pbc-001`) | Chompchomp Ltd (`https://chompchomp.example/entity/bvi-001`) |
| **BillOfLadingCredential** | `schemas/bill-of-lading-credential.yaml` | Shady Carrier Ltd (`https://shady-carrier.example/entity/aw-oru-001`) ⚠️ | Chompchomp Ltd (`https://chompchomp.example/entity/bvi-001`) |
| **CertificateOfOriginCredential** | `schemas/certificate-of-origin-credential.yaml` | Legit Shrimp Ltd (`https://legit-shrimp.example/entity/tt-pos-001`) 🚨 | Shady Distributor Ltd (`https://shady-distributor.example/entity/bvi-002`) |

### Fraud Indicators
- ⚠️ **Bill of Lading**: Shows suspicious quantity discrepancy (1000kg → 800kg, claiming 200kg "lost")
- 🚨 **Certificate of Origin**: Fraudulent signature (Shady Distributor impersonating Legit Shrimp)

## Running the Demo

Execute the complete fraud investigation workflow:

```bash
bash demo.sh
```

### Demo Phases

1. **Schema Validation**: Validate all credential schemas
2. **Controller Generation**: Create public controller documents from private keys
3. **Key Extraction**: Extract public keys for verification
4. **Credential Signing**: Sign documents with respective entity keys
5. **Geographic Analysis**: Analyze GeoJSON shipping routes
6. **Fraud Detection**: Verify credentials and detect forgeries
7. **Challenge-Response**: US Customs presentation workflow with CNF verification

## Key Features Demonstrated

### CNF Claims & Presentation Security
- **Credential Binding**: Credentials bound to holder's authentication key via CNF claims
- **Theft Prevention**: Stolen credentials cannot be presented by unauthorized parties
- **Cross-Entity Binding**: Camarón Corriente issues credentials for Chompchomp to present

### Challenge-Response Protocol
1. **Challenge**: US Customs provides audience (geohash) and nonce
2. **Response**: Holder creates presentation signed with authentication key
3. **Verification**: CNF claims validated against presentation signature

### Geographic Tracking
All credentials contain GeoJSON FeatureCollections for geographic analysis:
- **Points**: Entity locations (offices, facilities)
- **LineStrings**: Shipping routes between jurisdictions
- **Analysis**: Coordinate validation, route mapping, geographic context

## Investigation Results

The demo proves that:
1. ✅ **Quantity Fraud Detected**: Bill of Lading shows 200kg shortage
2. ✅ **Identity Theft Detected**: Certificate signature verification fails
3. ✅ **CNF Binding Works**: Only legitimate holder can present credentials
4. ✅ **Geographic Tracking**: Full supply chain route mapped from Venezuela → Aruba → BVI
5. ✅ **Presentation Security**: Stolen credentials cannot be fraudulently presented

This case study demonstrates how verifiable credentials with CNF claims provide robust protection against supply chain fraud through cryptographic proof and geographic traceability.

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