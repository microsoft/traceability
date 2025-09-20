<details>
<summary>🗺️ Supply Chain Geographic Data - Feature collection with 1 features containing LineString</summary>

### 📊 Geographic Analysis

- **Type**: FeatureCollection
- **Features**: 1
- **Geometry Types**: LineString
- **Bounding Box**: 10.4647°N, 70.0270°W to 18.4167°N, 64.6208°W

### 🏷️ Feature Properties

**Feature 1:**
  - **type**: BillOfLading
  - **description**: 800kg frozen shrimp (200kg reported destroyed)
  - **quantity**: 800kg
  - **carrier**: Shady Carrier Ltd
  - **shipper**: Camarón Corriente S.A.
  - **consignee**: Chompchomp Ltd
  - **billOfLadingNumber**: BOL-2024-001
  - **vesselName**: MV Suspicious

### 📍 Coordinates

1. 10.4647°N, 68.0125°W
2. 12.5186°N, 70.0270°W
3. 18.4167°N, 64.6208°W

### 📄 Raw GeoJSON

```geojson
{
  "id": "https://bills.example/bol-2024-001",
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [
            -68.0125,
            10.4647
          ],
          [
            -70.027,
            12.5186
          ],
          [
            -64.6208,
            18.4167
          ]
        ]
      },
      "properties": {
        "type": "BillOfLading",
        "billOfLadingNumber": "BOL-2024-001",
        "carrier": {
          "id": "https://shady-carrier.example/entity/aw-oru-001",
          "name": "Shady Carrier Ltd"
        },
        "shipper": {
          "id": "https://camaron-corriente.example/entity/ve-pbc-001",
          "name": "Camarón Corriente S.A."
        },
        "consignee": {
          "id": "https://chompchomp.example/entity/bvi-001",
          "name": "Chompchomp Ltd"
        },
        "description": "800kg frozen shrimp (200kg reported destroyed)",
        "quantity": "800kg",
        "vesselName": "MV Suspicious"
      }
    }
  ]
}
```

### 🚛 Supply Chain Context

- **Shipper**: Camarón Corriente S.A.
- **Carrier**: Shady Carrier Ltd
- **Consignee**: Chompchomp Ltd
- **Quantity**: 800kg
- **Vessel**: MV Suspicious

</details>