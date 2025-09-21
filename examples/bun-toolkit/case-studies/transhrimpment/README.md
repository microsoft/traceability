# Transhrimpment

This case study examines a hypothetical seafood supply chain fraud involving the transhipment and relabeling of frozen shrimp products. The investigation demonstrates how document fraud, identity theft, and synthetic identities can compromise verifiable supply chains, particularly within cold chain logistics operations. The methodologies and findings presented are applicable to pharmaceutical distribution, food safety verification, and other critical supply chains requiring comprehensive traceability.

## Case Overview

The investigation centers on Chompchomp Ltd, a seafood import company registered in Road Town, Tortola, British Virgin Islands. On **January 10, 2024 09:00 AM UTC**, Chompchomp Ltd executed a procurement contract with Camarón Corriente S.A., a seafood distributor operating from Puerto Cabello, Venezuela.

On **January 15, 2024 09:15 AM UTC**, Chompchomp Ltd submitted a purchase order for 1,000 kg of frozen shrimp, and on **January 20, 2024 08:45 AM UTC**, Camarón Corriente S.A. issued a commercial invoice.

## Supply Chain Disruption and Fraud Initiation

On **January 22, 2024 09:30 AM UTC**, Camarón Corriente S.A. issued a certificate of origin for the Venezuelan shrimp shipment. On **January 25, 2024**, the designated carrier, Cargo Line Ltd (San Juan, Puerto Rico), reported inability to fulfill shipping obligations due to hurricane-related fleet damage. Under delivery pressure, Camarón Corriente S.A. expedited their vendor vetting process and engaged Shady Carrier Ltd (Oranjestad, Aruba) as an alternative carrier on **January 26, 2024**.

On **February 1, 2024 08:30 AM UTC**, Shady Carrier Ltd completed delivery while simultaneously executing document fraud by creating falsified bills of lading indicating partial cargo loss during transit. At **February 1, 2024 02:15 PM UTC**, Shady Carrier Ltd created forged bills of lading to support their fraudulent partial loss claims.

## Fraudulent Diversion and Identity Appropriation

On **February 3, 2024**, Shady Carrier Ltd transferred the allegedly destroyed goods to Shady Distributor Ltd, a recently incorporated entity registered in Road Town, Tortola, British Virgin Islands, operating as a front company.

On **February 5, 2024 09:45 AM UTC**, Shady Distributor Ltd fabricated certificates of origin falsely attributing the shrimp to Legit Shrimp Ltd, an established supplier based in Port of Spain, Trinidad and Tobago.

**Analysis Note:** Legit Shrimp Ltd maintains legitimate certificates of origin for their actual products, but their corporate identity was appropriated for fraudulent purposes. Shady Distributor Ltd was established specifically to facilitate the sale of diverted goods. By presenting compromised credentials and forged certificates bearing Legit Shrimp Ltd's identity, Shady Distributor Ltd leveraged the legitimate supplier's established trade relationships and reputation.

## Secondary Distribution and Document Compromise

On **February 10, 2024 10:20 AM UTC**, Anonymous Distributor (Charlotte Amalie, St. Thomas, U.S. Virgin Islands) placed an order for 500 kg of frozen shrimp from Shady Distributor Ltd. Delivery was completed on **February 15, 2024** via the now-operational Cargo Line Ltd.

On **February 12, 2024 11:15 AM UTC**, Shady Distributor Ltd issued a commercial invoice for the secondary transaction. At **February 15, 2024 07:45 AM UTC**, Cargo Line Ltd issued a bill of lading for the secondary delivery, maintaining apparent legitimacy.

Investigation revealed that on **February 8, 2024**, Shady Distributor Ltd had acquired through unauthorized means an authentic Certificate of Origin originally issued by Legit Shrimp Ltd to Honest Importer Ltd on **January 5, 2024 08:20 AM UTC**. This document compromise demonstrates how legitimate credentials can be misappropriated to provide fraudulent transactions with apparent authenticity.

On **February 20, 2024**, customs documentation was filed classifying the imported shrimp under HS code 0306.17 with declared origin of Trinidad and Tobago. On **March 1, 2024**, laboratory analysis detected chemical contamination, triggering a comprehensive regulatory investigation that exposed the fraud scheme.

## Credential Presentation Timeline

The following timeline shows when credentials were presented for verification during the investigation:

- **January 15, 2024 10:30 AM UTC**: Purchase order credentials presented to `Camarón Corriente S.A.` for order processing
- **January 20, 2024 11:15 AM UTC**: Commercial invoice credentials presented to `Chompchomp Ltd` for payment verification
- **January 22, 2024 12:45 PM UTC**: Certificate of origin credentials presented to shipping carrier for export documentation
- **February 1, 2024 01:20 PM UTC**: Bill of lading credentials presented to `Chompchomp Ltd` for delivery acceptance
- **February 1, 2024 03:45 PM UTC**: Forged bill of lading credentials presented to customs for partial loss claim
- **February 5, 2024 11:25 AM UTC**: FRAUDULENT certificate of origin credentials presented by `Shady Distributor Ltd` claiming `Legit Shrimp Ltd` identity
- **February 8, 2024 02:15 PM UTC**: STOLEN legitimate certificate credentials inappropriately presented by `Shady Distributor Ltd`
- **February 10, 2024 01:35 PM UTC**: Secondary purchase order credentials presented to `Shady Distributor Ltd` for order processing
- **February 12, 2024 02:50 PM UTC**: Secondary commercial invoice credentials presented to `Anonymous Distributor` for payment
- **February 15, 2024 10:20 AM UTC**: Secondary bill of lading credentials presented to `Anonymous Distributor` for delivery

## Security Analysis

The investigation revealed three critical types of fraud that compromised this supply chain:

### Document Compromise
In our seafood supply chain, `Shady Distributor Ltd` gains access to a legitimate Certificate of Origin originally issued by `Legit Shrimp Ltd` to `Honest Importer Ltd`. This represents document compromise - the theft or unauthorized access to authentic supply chain documents. In traditional supply chains, this could involve stealing physical certificates, intercepting digital communications, or exploiting data breaches to obtain legitimate trade documents. The compromised documents are then presented as proof of legitimate sourcing, even though the thief was not the rightful credential holder.

### Counterfeiting and Alteration
`Shady Carrier Ltd` demonstrates sophisticated document counterfeiting by forging Bill of Lading documentation to make it appear that part of the frozen shrimp shipment was destroyed during transit. This allows them to divert goods while maintaining the appearance of legitimate transport. Similarly, `Shady Distributor Ltd` creates entirely fabricated Certificates of Origin claiming the shrimp originated from `Legit Shrimp Ltd` in Trinidad and Tobago, when in reality it came from Venezuela. These counterfeit documents enable the fraudulent goods to pass through customs and regulatory checks, bypassing the traceability systems designed to ensure food safety and prevent illegal trade.

### Synthetic Identity Fraud
The scenario demonstrates how criminal organizations create synthetic supply chain identities to facilitate their operations. `Shady Carrier Ltd` invents `Shady Distributor Ltd` as a front company to fence the stolen goods, operating both entities under the same criminal organization. This synthetic identity combines legitimate business registration details (Road Town, Tortola, BVI) with fabricated operational history and stolen credentials from `Legit Shrimp Ltd` to create the appearance of a legitimate seafood distributor. By creating this synthetic supply chain identity, the criminals can operate within the legitimate trade system while maintaining plausible deniability and making it more difficult for authorities to trace the fraudulent activities back to the original theft.


### Investigation Methodology

The investigation employs a systematic verification approach that analyzes the cryptographic relationships between controllers, credentials, and presentations to detect fraudulent activities:

**Document Compromise Detection**: Document compromise is identified through verification key analysis. When a credential's confirmation key identifier (`cnf.kid`) does not match the key identifier used by the presentation holder to authenticate the presentation, this indicates unauthorized credential usage. Both the credential and presentation may individually verify successfully, but the key mismatch reveals that the credential has been stolen and is being presented by an unauthorized party.

**Synthetic Identity Fraud Detection**: Synthetic identity entities are identified through comprehensive analysis of their operational legitimacy and documentation provenance. An entity is classified as a synthetic identity when its existence and operational capacity are established primarily through fabricated business records, stolen credentials, or entirely fictitious operational history. Legitimate entities that inadvertently process fraudulent documents are not classified as synthetic identities; this classification is reserved exclusively for entities whose identity framework is constructed from falsified or appropriated sources.

**Counterfeiting and Alteration Detection**: Counterfeit credentials are detected when documents are issued by synthetic identity entities and contain claims that mirror those found in compromised legitimate credentials. This pattern reveals systematic document forgery operations where fraudsters create falsified documents that replicate the content and structure of stolen legitimate credentials to bypass verification systems.