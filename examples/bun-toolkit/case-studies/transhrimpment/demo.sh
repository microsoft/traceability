#!/bin/bash

# Transhrimpment Case Study - Digital Investigation Demo
# This script demonstrates the CLI workflow for investigating supply chain fraud

echo "🔍 Starting Transhrimpment Digital Investigation Demo"
echo "=================================================="

# Ensure output directories exist
mkdir -p case-studies/transhrimpment/{signed,controllers,keys}

echo ""
echo "📋 Step 1: Schema Validation"
echo "----------------------------"

# Validate all schemas
echo "Validating purchase order schema..."
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/purchase-order-credential.yaml

echo ""
echo "Validating commercial invoice schema..."
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/commercial-invoice-credential.yaml

echo ""
echo "Validating certificate of origin schema..."
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/certificate-of-origin-credential.yaml

echo ""
echo "Validating bill of lading schema..."
bun src/cli.ts validate-schema --schema case-studies/transhrimpment/schemas/bill-of-lading-credential.yaml

echo ""
echo "📝 Step 2: Generate PUBLIC Controller Documents"
echo "==============================================="
echo "🔒 Reading PRIVATE entity configurations..."
echo "🌐 Generating PUBLIC controller documents (safe to share)..."

# Generate PUBLIC controllers from PRIVATE entity configurations
echo "Generating Chompchomp PUBLIC controller..."
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/chompchomp.json --out case-studies/transhrimpment/controllers/chompchomp-controller.json

echo ""
echo "Generating Camarón Corriente PUBLIC controller..."
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/camaron-corriente.json --out case-studies/transhrimpment/controllers/camaron-corriente-controller.json

echo ""
echo "Generating Shady Carrier PUBLIC controller..."
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/shady-carrier.json --out case-studies/transhrimpment/controllers/shady-carrier-controller.json

echo ""
echo "Generating Legit Shrimp PUBLIC controller..."
bun src/cli.ts generate-controller --config case-studies/transhrimpment/entity_configurations/legit-shrimp.json --out case-studies/transhrimpment/controllers/legit-shrimp-controller.json

echo ""
echo "🔐 Step 3: Extract PUBLIC Keys for Verification"
echo "================================================"
echo "🔒 Reading PRIVATE entity configurations to extract PUBLIC keys..."

# Extract PUBLIC keys from PRIVATE entity configurations for verification
echo "Extracting Chompchomp PUBLIC key (for verification)..."
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/chompchomp.json --out case-studies/transhrimpment/keys/chompchomp-public.json

echo ""
echo "Extracting Camarón Corriente PUBLIC key..."
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/camaron-corriente.json --out case-studies/transhrimpment/keys/camaron-corriente-public.json

echo ""
echo "Extracting Shady Carrier PUBLIC key..."
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/shady-carrier.json --out case-studies/transhrimpment/keys/shady-carrier-public.json

echo ""
echo "Extracting Legit Shrimp PUBLIC key..."
bun src/cli.ts extract-public-key --key case-studies/transhrimpment/entity_configurations/legit-shrimp.json --out case-studies/transhrimpment/keys/legit-shrimp-public.json

echo ""
echo "✍️  Step 4: Sign Supply Chain Credentials"
echo "==========================================="
echo "🔒 Using PRIVATE entity configurations to sign documents..."

# Sign credentials following the fraud timeline using PRIVATE keys
echo "Signing Purchase Order (using Chompchomp's PRIVATE keys)..."
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/chompchomp.json --cred case-studies/transhrimpment/credentials/purchase-order.json --out case-studies/transhrimpment/signed/purchase-order-signed.json

echo ""
echo "Signing Commercial Invoice (using Camarón Corriente's PRIVATE keys)..."
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/camaron-corriente.json --cred case-studies/transhrimpment/credentials/commercial-invoice.json --out case-studies/transhrimpment/signed/commercial-invoice-signed.json

echo ""
echo "Signing Bill of Lading (using Shady Carrier's PRIVATE keys - QUANTITY FRAUD!)..."
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/shady-carrier.json --cred case-studies/transhrimpment/credentials/bill-of-lading.json --out case-studies/transhrimpment/signed/bill-of-lading-signed.json

echo ""
echo "⚠️  FRAUD ATTEMPT: Shady Distributor using their PRIVATE keys but claiming to be Legit Shrimp..."
bun src/cli.ts sign-credential --key case-studies/transhrimpment/entity_configurations/shady-distributor.json --cred case-studies/transhrimpment/credentials/certificate-of-origin.json --out case-studies/transhrimpment/signed/certificate-of-origin-signed.json

echo ""
echo "🔍 Step 5: Verification and Fraud Detection"
echo "==========================================="

echo ""
echo "✅ Verifying Legitimate Credentials (using PUBLIC keys):"
echo "========================================================="

echo "Verifying Purchase Order using Chompchomp's PUBLIC key..."
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/purchase-order-signed.json --key case-studies/transhrimpment/keys/chompchomp-public.json

echo ""
echo "Verifying Commercial Invoice using Camarón Corriente's PUBLIC key..."
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/commercial-invoice-signed.json --key case-studies/transhrimpment/keys/camaron-corriente-public.json

echo ""
echo "❌ Detecting Fraudulent Activity:"
echo "=================================="

echo "Verifying Bill of Lading using Shady Carrier's PUBLIC key..."
echo "(Signature will pass, but document shows only 800kg vs 1000kg invoice - QUANTITY FRAUD!)"
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/bill-of-lading-signed.json --key case-studies/transhrimpment/keys/shady-carrier-public.json

echo ""
echo "🚨 FRAUD DETECTION: Testing Certificate of Origin against Legit Shrimp's PUBLIC key..."
echo "This SHOULD FAIL because Shady Distributor signed it with their PRIVATE keys:"
echo "(The signature is mathematically valid but from the wrong entity)"
bun src/cli.ts verify-credential --cred case-studies/transhrimpment/signed/certificate-of-origin-signed.json --key case-studies/transhrimpment/keys/legit-shrimp-public.json || echo "❌ VERIFICATION FAILED - SIGNATURE MISMATCH = FRAUD DETECTED!"

echo ""
echo "📊 Investigation Results Summary:"
echo "================================"
echo "✅ Purchase Order: Legitimate (signed by Chompchomp)"
echo "✅ Commercial Invoice: Legitimate (signed by Camarón Corriente) - shows 1000kg"
echo "⚠️  Bill of Lading: Technically valid signature, but shows only 800kg - QUANTITY THEFT!"
echo "❌ Certificate of Origin: FORGED - claims Legit Shrimp origin but wrong signature"
echo ""
echo "🎯 Fraud Evidence:"
echo "- 200kg of shrimp stolen during transit (1000kg → 800kg)"
echo "- False origin certificate to cover up theft"
echo "- Chain of custody compromised at Shady Carrier"
echo "- Identity theft of Legit Shrimp Ltd"
echo ""
echo "🔐 Digital forensics using verifiable credentials successfully exposed the fraud!"