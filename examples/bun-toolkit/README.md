# Supply Chain Traceability Toolkit

A comprehensive toolkit for supply chain fraud investigation using verifiable credentials with GeoJSON support and presentation-based authentication.

## Installation

```bash
bun install
```

## Features

- **Supply Chain Fraud Detection**: Automated detection of document compromise, synthetic identity fraud, and counterfeiting
- **GeoJSON Integration**: Geographic visualization of supply chain entities and credential flows
- **Schema Validation**: Comprehensive credential schema validation with flattened snake_case properties
- **Presentation Verification**: Cryptographic verification of credential presentations with holder binding
- **Business Logic Analysis**: Quantity discrepancy detection and content similarity analysis

## Case Studies

### Transhrimpment Fraud Investigation

Run the comprehensive seafood supply chain fraud investigation demo:

```bash
bun test case-studies/transhrimpment/test/transhrimpment.test.ts
```

This demonstrates:
- **Document Compromise**: Detection of stolen legitimate credentials
- **Synthetic Identity Fraud**: Identification of fabricated business entities
- **Counterfeiting & Alteration**: Discovery of forged documents and quantity discrepancies
- **Geographic Mapping**: GeoJSON report with 28 features across 8 jurisdictions

The test generates a detailed GeoJSON report at `case-studies/transhrimpment/report.json` with fraud evidence and geographic data for visualization.

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
