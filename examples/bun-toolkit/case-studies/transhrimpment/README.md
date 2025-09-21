# Transhrimpment

This case study examines a synthetic seafood supply chain fraud involving transhipped and relabelled frozen shrimp products.
The investigation reveals how document fraud, identity theft, and synthetic identities can compromise verifiable supply chains, particularly in cold chain logistics.
The techniques demonstrated here are applicable to pharmaceuticals, food safety, and other critical supply chains requiring traceability.

The case involves a small seafood importer called `Chompchomp Ltd` based in `Road Town, Tortola, British Virgin Islands`.
On **January 10, 2024**, `Chompchomp Ltd` signed a contract with a seafood distributor called `Camarón Corriente S.A.` based in `Puerto Cabello, Venezuela`.

On **January 15, 2024**, `Chompchomp Ltd` submitted a purchase order to `Camarón Corriente S.A.` for 1000kg of frozen shrimp, and on **January 20, 2024**, `Camarón Corriente S.A.` sent a commercial invoice to `Chompchomp Ltd`.

On **January 25, 2024**, `Camarón Corriente S.A.`'s usual carrier, `Cargo Line Ltd` based in `San Juan, Puerto Rico`, was unable to deliver the goods due to hurricane damage requiring fleet repairs.

On **January 26, 2024**, `Camarón Corriente S.A.` rushed their vetting process and contracted with `Shady Carrier Ltd` based in `Oranjestad, Aruba` as an alternative carrier.

On **February 1, 2024**, `Shady Carrier Ltd` quickly delivers the goods but forges critical supply chain documentation to make it appear that part of the frozen shrimp was destroyed during transit.

On **February 3, 2024**, `Shady Carrier Ltd` then sells the goods to a recently registered seafood distributor called `Shady Distributor Ltd` who is also based in `Road Town, Tortola, British Virgin Islands`.

On **February 5, 2024**, `Shady Distributor Ltd` forges fresh certifcates of origin that say the frozen shrimp was sourced from a legitimate supplier called `Legit Shrimp Ltd` based out of `Port of Spain, Trinidad and Tobago`.

**Note:** `Legit Shrimp Ltd` is a legitimate supplier that has proper certificates of origin for their actual shrimp products, but their identity was stolen and used fraudulently. `Shady Distributor Ltd` was created as a front company to facilitate the sale of stolen goods. By presenting stolen credentials and forged certificates from `Legit Shrimp Ltd`, `Shady Distributor Ltd` was able to establish credibility as a legitimate seafood distributor with established supply chain relationships, making it easier to conduct business with unsuspecting customers like `Anonymous Distributor`.

On **February 10, 2024**, a seafood distributor in `Charlotte Amalie, St. Thomas, U.S. Virgin Islands` (`Anonymous Distributor`) placed an order for 500kg of frozen shrimp from `Shady Distributor Ltd`. On **February 15, 2024**, `Shady Distributor Ltd` used the now-repaired `Cargo Line Ltd` to deliver the goods.

On **February 12, 2024**, the secondary transaction generated purchase orders, commercial invoices, and a bill of lading from `Cargo Line Ltd` that appeared legitimate on the surface.

However, the investigation reveals that on **February 8, 2024**, `Shady Distributor Ltd` not only forged new documents but also attempted to use a genuine Certificate of Origin originally issued by `Legit Shrimp Ltd` to `Honest Importer Ltd` on **January 5, 2024**. By acquiring this valid certificate through unauthorized means, `Shady Distributor Ltd` tried to pass off their shrimp as legitimately sourced, despite not being the rightful holder. This highlights how the misuse of authentic documents can undermine trust in the supply chain and obscure the true origin of goods.

On **February 20, 2024**, the customs broker filed paperwork for the imported shrimp as HS code 0306.17, originating from `Trinidad and Tobago`.
On **March 1, 2024**, lab tests revealed chemical contamination in the shrimp, triggering a regulatory investigation that uncovered the fraud.

## Credential Presentation Timeline

The following timeline shows when credentials were presented for verification during the investigation:

- **January 15, 2024 10:30 AM**: Purchase order credentials presented to `Camarón Corriente S.A.` for order processing
- **January 20, 2024 10:30 AM**: Commercial invoice credentials presented to `Chompchomp Ltd` for payment verification
- **January 22, 2024 10:30 AM**: Certificate of origin credentials presented to shipping carrier for export documentation
- **February 1, 2024 10:30 AM**: Bill of lading credentials presented to `Chompchomp Ltd` for delivery acceptance
- **February 1, 2024 11:30 AM**: Forged bill of lading credentials presented to customs for partial loss claim
- **February 5, 2024 10:30 AM**: FRAUDULENT certificate of origin credentials presented by `Shady Distributor Ltd` claiming `Legit Shrimp Ltd` identity
- **February 8, 2024 10:30 AM**: STOLEN legitimate certificate credentials inappropriately presented by `Shady Distributor Ltd`
- **February 10, 2024 11:30 AM**: Secondary purchase order credentials presented to `Shady Distributor Ltd` for order processing
- **February 12, 2024 10:30 AM**: Secondary commercial invoice credentials presented to `Anonymous Distributor` for payment
- **February 15, 2024 10:30 AM**: Secondary bill of lading credentials presented to `Anonymous Distributor` for delivery

## Security Analysis

The investigation revealed three critical types of fraud that compromised this supply chain:

### Document Compromise
In our seafood supply chain, `Shady Distributor Ltd` gains access to a legitimate Certificate of Origin originally issued by `Legit Shrimp Ltd` to `Honest Importer Ltd`. This represents document compromise - the theft or unauthorized access to authentic supply chain documents. In traditional supply chains, this could involve stealing physical certificates, intercepting digital communications, or exploiting data breaches to obtain legitimate trade documents. The compromised documents are then presented as proof of legitimate sourcing, even though the thief was not the rightful credential holder.

### Counterfeiting and Alteration
`Shady Carrier Ltd` demonstrates sophisticated document counterfeiting by forging Bill of Lading documentation to make it appear that part of the frozen shrimp shipment was destroyed during transit. This allows them to divert goods while maintaining the appearance of legitimate transport. Similarly, `Shady Distributor Ltd` creates entirely fabricated Certificates of Origin claiming the shrimp originated from `Legit Shrimp Ltd` in Trinidad and Tobago, when in reality it came from Venezuela. These counterfeit documents enable the fraudulent goods to pass through customs and regulatory checks, bypassing the traceability systems designed to ensure food safety and prevent illegal trade.

### Synthetic Identity Fraud
The scenario demonstrates how criminal organizations create synthetic supply chain identities to facilitate their operations. `Shady Carrier Ltd` invents `Shady Distributor Ltd` as a front company to fence the stolen goods, operating both entities under the same criminal organization. This synthetic identity combines legitimate business registration details (Road Town, Tortola, BVI) with fabricated operational history and stolen credentials from `Legit Shrimp Ltd` to create the appearance of a legitimate seafood distributor. By creating this synthetic supply chain identity, the criminals can operate within the legitimate trade system while maintaining plausible deniability and making it more difficult for authorities to trace the fraudulent activities back to the original theft.
