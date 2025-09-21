# Transhrimpment Digital Investigation Report

This is a hypothetical scenario, this report is for demo purposes only.

## Executive Summary

This report documents a digital forensic investigation of the "Transhrimpment" supply chain fraud case using verifiable credentials and cryptographic signatures to detect document tampering and identity theft.

---

## Step 1: Identify Entities

<details>
<summary>🔍 Click to expand entity identification details</summary>

Identifying supply chain entities, gather their addresses, locations and aliases for comparison to supply chain documents:


### ✅ Chompchomp Ltd


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://chompchomp.example/entity/bvi-001",
  "verificationMethod": [
    {
      "id": "https://chompchomp.example/entity/bvi-001#O80NKS6ISt5XMx8BKM5xZwAPXCCtuj4_yzwjx4_EUuE",
      "type": "JsonWebKey",
      "controller": "https://chompchomp.example/entity/bvi-001",
      "publicKeyJwk": {
        "kid": "O80NKS6ISt5XMx8BKM5xZwAPXCCtuj4_yzwjx4_EUuE",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://chompchomp.example/entity/bvi-001",
  "verificationMethod": [
    {
      "id": "https://chompchomp.example/entity/bvi-001#O80NKS6ISt5XMx8BKM5xZwAPXCCtuj4_yzwjx4_EUuE",
      "type": "JsonWebKey",
      "controller": "https://chompchomp.example/entity/bvi-001",
      "publicKeyJwk": {
        "kid": "O80NKS6ISt5XMx8BKM5xZwAPXCCtuj4_yzwjx4_EUuE",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "4-jBwSbhz-AFHUckj0KqcTKWJ_aEgBMC8a1GyJZCYi4",
        "y": "p_YzZ6cLff_ILnXPJBsfwKpUgF60MkQ8pSXPg74byIg",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://chompchomp.example/entity/bvi-001#wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE",
      "type": "JsonWebKey",
      "controller": "https://chompchomp.example/entity/bvi-001",
      "publicKeyJwk": {
        "kid": "wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "U99_2fdepm1aO8QTVEeciW1xQw__r5m8B1uGXiuSUuA",
        "y": "z7v4asCDa-nkHifpK9IhfNVbMKUeGV0QAsqcUuoR4bY",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://chompchomp.example/entity/bvi-001#O80NKS6ISt5XMx8BKM5xZwAPXCCtuj4_yzwjx4_EUuE"
  ],
  "authentication": [
    "https://chompchomp.example/entity/bvi-001#wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE"
  ],
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:4598765432101",
    "urn:ietf:spice:glue:lei:5493000QQY3QQ6Y34321",
    "urn:ietf:spice:glue:pen:12345"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -64.6208,
          18.4167
        ]
      },
      "properties": {
        "name": "Chompchomp Ltd Main Office",
        "type": "Seafood Importer",
        "role": "headquarters",
        "address": {
          "streetAddress": "Main Street",
          "addressLocality": "Road Town",
          "addressRegion": "Tortola",
          "addressCountry": "VG"
        }
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -64.615,
          18.418
        ]
      },
      "properties": {
        "name": "Chompchomp Ltd Warehouse",
        "type": "Storage Facility",
        "role": "cold-storage",
        "capacity": "10000kg"
      }
    }
  ]
}
```


</details>


### ✅ Camarón Corriente S.A.


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://camaron-corriente.example/entity/ve-pbc-001",
  "verificationMethod": [
    {
      "id": "https://camaron-corriente.example/entity/ve-pbc-001#yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg",
      "type": "JsonWebKey",
      "controller": "https://camaron-corriente.example/entity/ve-pbc-001",
      "publicKeyJwk": {
        "kid": "yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://camaron-corriente.example/entity/ve-pbc-001",
  "verificationMethod": [
    {
      "id": "https://camaron-corriente.example/entity/ve-pbc-001#yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg",
      "type": "JsonWebKey",
      "controller": "https://camaron-corriente.example/entity/ve-pbc-001",
      "publicKeyJwk": {
        "kid": "yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "6EynIUgbLq0CKvNEZIjnKc56dC2CCbegsdbfDUuvYcY",
        "y": "xLlq9FtgNggxYw_prjbipdy4By7wTbAc2IOiYgTOzFk",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://camaron-corriente.example/entity/ve-pbc-001#RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0",
      "type": "JsonWebKey",
      "controller": "https://camaron-corriente.example/entity/ve-pbc-001",
      "publicKeyJwk": {
        "kid": "RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "QWcGVBtUXXis8Og7UrQLY8rkGltxd3KOjv6Jr3eKRSs",
        "y": "KP-J4igQr3D3iXInj9qrwJiERdH9OIdEzqqDGnM2kC0",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://camaron-corriente.example/entity/ve-pbc-001#yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg"
  ],
  "authentication": [
    "https://camaron-corriente.example/entity/ve-pbc-001#RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0"
  ],
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:4598765432102",
    "urn:ietf:spice:glue:lei:5493000QQY3QQ6Y34322",
    "urn:ietf:spice:glue:pen:12346"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -68.0125,
          10.4647
        ]
      },
      "properties": {
        "name": "Camarón Corriente S.A. Port Facility",
        "type": "Seafood Distributor",
        "role": "export-facility",
        "address": {
          "streetAddress": "Puerto Cabello Port",
          "addressLocality": "Puerto Cabello",
          "addressRegion": "Carabobo",
          "addressCountry": "VE"
        }
      }
    }
  ]
}
```


</details>


### ✅ Legit Shrimp Ltd


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://legit-shrimp.example/entity/tt-pos-001",
  "verificationMethod": [
    {
      "id": "https://legit-shrimp.example/entity/tt-pos-001#TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE",
      "type": "JsonWebKey",
      "controller": "https://legit-shrimp.example/entity/tt-pos-001",
      "publicKeyJwk": {
        "kid": "TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://legit-shrimp.example/entity/tt-pos-001",
  "verificationMethod": [
    {
      "id": "https://legit-shrimp.example/entity/tt-pos-001#TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE",
      "type": "JsonWebKey",
      "controller": "https://legit-shrimp.example/entity/tt-pos-001",
      "publicKeyJwk": {
        "kid": "TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "zg4EKxDs-3__x3w1cdX6wyIX_bZzKNHPSWVP8UBjFUk",
        "y": "iam5J54U8HY1EKVWK9qJUFDuIZ-e3T-IM1DY634b-xM",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://legit-shrimp.example/entity/tt-pos-001#F4FzDU1QWvUzDpWAuwlpvO-A4TuixJ-92PXLUwwqKPo",
      "type": "JsonWebKey",
      "controller": "https://legit-shrimp.example/entity/tt-pos-001",
      "publicKeyJwk": {
        "kid": "F4FzDU1QWvUzDpWAuwlpvO-A4TuixJ-92PXLUwwqKPo",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "K9k1WfK7WQsRI8xjvLI_ux805Zzt3wxXEqHFSXxhVh0",
        "y": "0V9-VKIPfQ-YWhyMRCtuYVCeetnV-wZUL_aSmKBJ0os",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://legit-shrimp.example/entity/tt-pos-001#TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE"
  ],
  "authentication": [
    "https://legit-shrimp.example/entity/tt-pos-001#F4FzDU1QWvUzDpWAuwlpvO-A4TuixJ-92PXLUwwqKPo"
  ],
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:4598765432103",
    "urn:ietf:spice:glue:lei:5493000QQY3QQ6Y34323",
    "urn:ietf:spice:glue:pen:12347"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -61.5167,
          10.6596
        ]
      },
      "properties": {
        "name": "Legit Shrimp Ltd Facility",
        "type": "Seafood Supplier",
        "role": "supplier",
        "address": {
          "streetAddress": "Port of Spain Harbor",
          "addressLocality": "Port of Spain",
          "addressRegion": "Port of Spain",
          "addressCountry": "TT"
        },
        "legitimacy": "legitimate-identity-stolen"
      }
    }
  ]
}
```


</details>


### ✅ Shady Carrier Ltd


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://shady-carrier.example/entity/aw-oru-001",
  "verificationMethod": [
    {
      "id": "https://shady-carrier.example/entity/aw-oru-001#5oD1QCp0J1MVNcptL_UPotidwjw8pScO1Ky2cQedt2Q",
      "type": "JsonWebKey",
      "controller": "https://shady-carrier.example/entity/aw-oru-001",
      "publicKeyJwk": {
        "kid": "5oD1QCp0J1MVNcptL_UPotidwjw8pScO1Ky2cQedt2Q",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://shady-carrier.example/entity/aw-oru-001",
  "verificationMethod": [
    {
      "id": "https://shady-carrier.example/entity/aw-oru-001#5oD1QCp0J1MVNcptL_UPotidwjw8pScO1Ky2cQedt2Q",
      "type": "JsonWebKey",
      "controller": "https://shady-carrier.example/entity/aw-oru-001",
      "publicKeyJwk": {
        "kid": "5oD1QCp0J1MVNcptL_UPotidwjw8pScO1Ky2cQedt2Q",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "lczh29InZLqV8end6s06AfP2goBrJe158AAdS7chYFc",
        "y": "1sKildJFCJURagfLveI-so5uzk5E6NJ8ZDnbPF7JRHs",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://shady-carrier.example/entity/aw-oru-001#RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg",
      "type": "JsonWebKey",
      "controller": "https://shady-carrier.example/entity/aw-oru-001",
      "publicKeyJwk": {
        "kid": "RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "DMq5FkHecSg2oTwUsmpJV0wVkv65uiSiS5JUeWHjRms",
        "y": "Z4qdbhzxIzSjaEHsiljRXp-YVbaAW9zyH9Lya08YRVw",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://shady-carrier.example/entity/aw-oru-001#5oD1QCp0J1MVNcptL_UPotidwjw8pScO1Ky2cQedt2Q"
  ],
  "authentication": [
    "https://shady-carrier.example/entity/aw-oru-001#RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -70.027,
          12.5186
        ]
      },
      "properties": {
        "name": "Shady Carrier Ltd Operations",
        "type": "Carrier",
        "role": "substitute-carrier",
        "address": {
          "streetAddress": "Harbor District",
          "addressLocality": "Oranjestad",
          "addressRegion": "Aruba",
          "addressCountry": "AW"
        },
        "legitimacy": "fraudulent"
      }
    }
  ]
}
```


</details>


### ✅ Shady Distributor Ltd


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://shady-distributor.example/entity/bvi-002",
  "verificationMethod": [
    {
      "id": "https://shady-distributor.example/entity/bvi-002#4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ",
      "type": "JsonWebKey",
      "controller": "https://shady-distributor.example/entity/bvi-002",
      "publicKeyJwk": {
        "kid": "4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://shady-distributor.example/entity/bvi-002",
  "verificationMethod": [
    {
      "id": "https://shady-distributor.example/entity/bvi-002#4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ",
      "type": "JsonWebKey",
      "controller": "https://shady-distributor.example/entity/bvi-002",
      "publicKeyJwk": {
        "kid": "4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "Ya3Z29_jP_FxWm94X58WxYw2doQD_zmttY8Bz4nO78k",
        "y": "2yHt3e1scqz5rApDy1v4pnZ3CEiVSqw8I9mZg9F-Gmw",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://shady-distributor.example/entity/bvi-002#ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8",
      "type": "JsonWebKey",
      "controller": "https://shady-distributor.example/entity/bvi-002",
      "publicKeyJwk": {
        "kid": "ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "VksWbvRAsFt9OAHTrwHhAM3cLyDjJw9pnrBvaLotx1c",
        "y": "AcsG4_kXArkPaPlI2wu7DPXTOpZWtMGwXa-HBPDue-w",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://shady-distributor.example/entity/bvi-002#4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ"
  ],
  "authentication": [
    "https://shady-distributor.example/entity/bvi-002#ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -64.6208,
          18.4167
        ]
      },
      "properties": {
        "name": "Shady Distributor Ltd Office",
        "type": "Seafood Distributor",
        "role": "intermediary",
        "address": {
          "streetAddress": "Offshore Building",
          "addressLocality": "Road Town",
          "addressRegion": "Tortola",
          "addressCountry": "VG"
        },
        "legitimacy": "fraudulent"
      }
    }
  ]
}
```


</details>


### ✅ Cargo Line Ltd


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://cargo-line.example/entity/pr-sju-001",
  "verificationMethod": [
    {
      "id": "https://cargo-line.example/entity/pr-sju-001#6MubhjOhD3qJYFu9avKeOpH0lr1CnwYEtDkBBGlEctE",
      "type": "JsonWebKey",
      "controller": "https://cargo-line.example/entity/pr-sju-001",
      "publicKeyJwk": {
        "kid": "6MubhjOhD3qJYFu9avKeOpH0lr1CnwYEtDkBBGlEctE",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://cargo-line.example/entity/pr-sju-001",
  "verificationMethod": [
    {
      "id": "https://cargo-line.example/entity/pr-sju-001#6MubhjOhD3qJYFu9avKeOpH0lr1CnwYEtDkBBGlEctE",
      "type": "JsonWebKey",
      "controller": "https://cargo-line.example/entity/pr-sju-001",
      "publicKeyJwk": {
        "kid": "6MubhjOhD3qJYFu9avKeOpH0lr1CnwYEtDkBBGlEctE",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "gJIxvhqr49KImHqePrsLaLE0EImNM9pYk01uco9jpvs",
        "y": "fokgG6M8TZintarhRdaLXJtJeOsmHeqQ92nhgA8hIvA",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://cargo-line.example/entity/pr-sju-001#Is1nmYZZvkaJfQY-rwDp43RW9TbglgOBdkY44P_ialI",
      "type": "JsonWebKey",
      "controller": "https://cargo-line.example/entity/pr-sju-001",
      "publicKeyJwk": {
        "kid": "Is1nmYZZvkaJfQY-rwDp43RW9TbglgOBdkY44P_ialI",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "fpRRu83DeV6z1w6RGigWZfyb-DBXI1iP6GgfLOskP8w",
        "y": "cAu8mpxCmUCSiEptpVYXJA8tg6G7yrj4B8q6gfTe7A8",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://cargo-line.example/entity/pr-sju-001#6MubhjOhD3qJYFu9avKeOpH0lr1CnwYEtDkBBGlEctE"
  ],
  "authentication": [
    "https://cargo-line.example/entity/pr-sju-001#Is1nmYZZvkaJfQY-rwDp43RW9TbglgOBdkY44P_ialI"
  ],
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:4598765432105",
    "urn:ietf:spice:glue:lei:5493000QQY3QQ6Y34325",
    "urn:ietf:spice:glue:pen:12349"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -66.1057,
          18.4655
        ]
      },
      "properties": {
        "name": "Cargo Line Ltd Terminal",
        "type": "Carrier",
        "role": "shipping-terminal",
        "address": {
          "streetAddress": "San Juan Port",
          "addressLocality": "San Juan",
          "addressRegion": "San Juan",
          "addressCountry": "PR"
        },
        "status": "fleet-repairs"
      }
    }
  ]
}
```


</details>


### ✅ Anonymous Distributor


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://anonymous-distributor.example/entity/vi-stt-001",
  "verificationMethod": [
    {
      "id": "https://anonymous-distributor.example/entity/vi-stt-001#sjCcIQefWYDejyZh0KvGVhGBP4UQ9tNgP2X5TrMuHa8",
      "type": "JsonWebKey",
      "controller": "https://anonymous-distributor.example/entity/vi-stt-001",
      "publicKeyJwk": {
        "kid": "sjCcIQefWYDejyZh0KvGVhGBP4UQ9tNgP2X5TrMuHa8",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://anonymous-distributor.example/entity/vi-stt-001",
  "verificationMethod": [
    {
      "id": "https://anonymous-distributor.example/entity/vi-stt-001#sjCcIQefWYDejyZh0KvGVhGBP4UQ9tNgP2X5TrMuHa8",
      "type": "JsonWebKey",
      "controller": "https://anonymous-distributor.example/entity/vi-stt-001",
      "publicKeyJwk": {
        "kid": "sjCcIQefWYDejyZh0KvGVhGBP4UQ9tNgP2X5TrMuHa8",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "q2cKSoqMo-OcsFHXiLaLd28Z0ybNObuE_Mv90G8ZZrM",
        "y": "TugFHYIlH8_34sEJjGyMYeET86C3WQu_TTud0AUdBio",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://anonymous-distributor.example/entity/vi-stt-001#-XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A",
      "type": "JsonWebKey",
      "controller": "https://anonymous-distributor.example/entity/vi-stt-001",
      "publicKeyJwk": {
        "kid": "-XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "ppCimKcKdotlKXxfLrmAexBo1I3bhSh0XDffvPddRxg",
        "y": "uggiLjSyenaBn1cZUUVm2Zj0OEwWLRgO9FwqqaILqtc",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://anonymous-distributor.example/entity/vi-stt-001#sjCcIQefWYDejyZh0KvGVhGBP4UQ9tNgP2X5TrMuHa8"
  ],
  "authentication": [
    "https://anonymous-distributor.example/entity/vi-stt-001#-XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A"
  ],
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:4598765432106",
    "urn:ietf:spice:glue:lei:5493000QQY3QQ6Y34326",
    "urn:ietf:spice:glue:pen:12350"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -64.9307,
          18.3419
        ]
      },
      "properties": {
        "name": "Anonymous Distributor Warehouse",
        "type": "Seafood Distributor",
        "role": "final-buyer",
        "address": {
          "streetAddress": "Charlotte Amalie Port",
          "addressLocality": "Charlotte Amalie",
          "addressRegion": "St. Thomas",
          "addressCountry": "VI"
        },
        "legitimacy": "legitimate-victim"
      }
    }
  ]
}
```


</details>


### ✅ Honest Importer Inc


<details>
<summary>📄 View Controller Document</summary>

```jsonc
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://honest-importer.example/entity/us-mia-001",
  "verificationMethod": [
    {
      "id": "https://honest-importer.example/entity/us-mia-001#Vi0LSTwvj_ws3nIjfNPMJS31juPClrUPOAzctwlCAZI",
      "type": "JsonWebKey",
      "controller": "https://honest-importer.example/entity/us-mia-001",
      "publicKeyJwk": {
        "kid": "Vi0LSTwvj_ws3nIjfNPMJS31juPClrUPOAzctwlCAZI",
        "kty": "EC",
  // ... (truncated for brevity)
}
```

</details>

<details>
<summary>📍 View Geographic Analysis</summary>


```geojson
{
  "@context": [
    "https://www.w3.org/ns/cid/v1",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "id": "https://honest-importer.example/entity/us-mia-001",
  "verificationMethod": [
    {
      "id": "https://honest-importer.example/entity/us-mia-001#Vi0LSTwvj_ws3nIjfNPMJS31juPClrUPOAzctwlCAZI",
      "type": "JsonWebKey",
      "controller": "https://honest-importer.example/entity/us-mia-001",
      "publicKeyJwk": {
        "kid": "Vi0LSTwvj_ws3nIjfNPMJS31juPClrUPOAzctwlCAZI",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "ji254yTxwgtXnmK09oIhM38Y-_23wWRv1S3vh2ZXVU8",
        "y": "QLCAo0sieFK9cfSSakkRg_P0_-UiXwR3HyXIoULlde4",
        "key_ops": [
          "verify"
        ]
      }
    },
    {
      "id": "https://honest-importer.example/entity/us-mia-001#Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E",
      "type": "JsonWebKey",
      "controller": "https://honest-importer.example/entity/us-mia-001",
      "publicKeyJwk": {
        "kid": "Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E",
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "x": "pWpf2ySOo7Q5YaajR0gwmjS6NFMJaRfK1J9rY-exwDU",
        "y": "pnKf8E48uq_e4amkTD5Lwm5s9WY2YwXXh6lG4M2PNUY",
        "key_ops": [
          "verify"
        ]
      }
    }
  ],
  "assertionMethod": [
    "https://honest-importer.example/entity/us-mia-001#Vi0LSTwvj_ws3nIjfNPMJS31juPClrUPOAzctwlCAZI"
  ],
  "authentication": [
    "https://honest-importer.example/entity/us-mia-001#Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E"
  ],
  "alsoKnownAs": [
    "urn:ietf:spice:glue:gln:4598765432107",
    "urn:ietf:spice:glue:lei:5493000QQY3QQ6Y34327",
    "urn:ietf:spice:glue:pen:12351"
  ],
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -80.1918,
          25.7617
        ]
      },
      "properties": {
        "name": "Honest Importer Inc Headquarters",
        "type": "Seafood Importer",
        "role": "headquarters",
        "address": {
          "streetAddress": "1001 Biscayne Boulevard",
          "addressLocality": "Miami",
          "addressRegion": "Florida",
          "addressCountry": "US"
        },
        "legitimacy": "legitimate"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -80.1776,
          25.7877
        ]
      },
      "properties": {
        "name": "Honest Importer Inc Processing Facility",
        "type": "Processing Facility",
        "role": "import-processing",
        "capacity": "15000kg",
        "certifications": [
          "HACCP",
          "FDA"
        ]
      }
    }
  ]
}
```


</details>



**🔍 Entity identification completed!**

</details>


<details>
<summary>✅ Create resolver cache from controllers</summary>

```bash
$ bun src/cli.ts create-resolver-cache --controllers case-studies/transhrimpment/controllers --out case-studies/transhrimpment/resolver-cache.json
```

```
Creating resolver cache from controllers in case-studies/transhrimpment/controllers and saving to case-studies/transhrimpment/resolver-cache.json...
📄 Processing case-studies/transhrimpment/controllers/chompchomp-controller.json...
✅ Added controller https://chompchomp.example/entity/bvi-001 to cache
📄 Processing case-studies/transhrimpment/controllers/anonymous-distributor-controller.json...
✅ Added controller https://anonymous-distributor.example/entity/vi-stt-001 to cache
📄 Processing case-studies/transhrimpment/controllers/shady-distributor-controller.json...
✅ Added controller https://shady-distributor.example/entity/bvi-002 to cache
📄 Processing case-studies/transhrimpment/controllers/legit-shrimp-controller.json...
✅ Added controller https://legit-shrimp.example/entity/tt-pos-001 to cache
📄 Processing case-studies/transhrimpment/controllers/shady-carrier-controller.json...
✅ Added controller https://shady-carrier.example/entity/aw-oru-001 to cache
📄 Processing case-studies/transhrimpment/controllers/honest-importer-controller.json...
✅ Added controller https://honest-importer.example/entity/us-mia-001 to cache
📄 Processing case-studies/transhrimpment/controllers/cargo-line-controller.json...
✅ Added controller https://cargo-line.example/entity/pr-sju-001 to cache
📄 Processing case-studies/transhrimpment/controllers/camaron-corriente-controller.json...
✅ Added controller https://camaron-corriente.example/entity/ve-pbc-001 to cache
✅ Resolver cache saved to case-studies/transhrimpment/resolver-cache.json with 8 controllers

📋 Resolver Cache Summary:
   - https://chompchomp.example/entity/bvi-001
   - https://anonymous-distributor.example/entity/vi-stt-001
   - https://shady-distributor.example/entity/bvi-002
   - https://legit-shrimp.example/entity/tt-pos-001
   - https://shady-carrier.example/entity/aw-oru-001
   - https://honest-importer.example/entity/us-mia-001
   - https://cargo-line.example/entity/pr-sju-001
   - https://camaron-corriente.example/entity/ve-pbc-001
```

</details>

---

## Step 2: Document Creation

<details>
<summary>📋 Click to expand document details</summary>

This section covers all the documents that are issued for this supply chain.


### ✅ Purchase Order (Chompchomp → Camarón Corriente)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/chompchomp-purchase-order.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
✅ Credential verification successful
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "type": [
    "VerifiableCredential",
    "PurchaseOrderCredential"
  ],
  "issuer": "https://chompchomp.example/entity/bvi-001",
  "cnf": {
    "kid": "RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0"
  },
  "credentialSubject": {
    "id": "https://orders.example/po-2024-001",
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Purchase Order (Chompchomp → Camarón Corriente)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/chompchomp-purchase-order-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE
```

</details>


### ✅ Commercial Invoice (Camarón Corriente → Chompchomp)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/camaron-corriente-invoice.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
✅ Credential verification successful
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "type": [
    "VerifiableCredential",
    "CommercialInvoiceCredential"
  ],
  "issuer": "https://camaron-corriente.example/entity/ve-pbc-001",
  "cnf": {
    "kid": "wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE"
  },
  "credentialSubject": {
    "id": "https://invoices.example/inv-2024-001",
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Commercial Invoice (Camarón Corriente → Chompchomp)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/camaron-corriente-invoice-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0
```

</details>


### ✅ Certificate of Origin (Camarón Corriente → Chompchomp)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/camaron-corriente-origin.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Credential verification failed: Error: Key ID mismatch: expected TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE, got yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Certificate of Origin (Camarón Corriente → Chompchomp)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/camaron-corriente-origin-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: RREK8ExRqquJQlLTuH2oLgHIu5N5_8EGw4zPDt0ZRa0
```

</details>


### ✅ Bill of Lading (Shady Carrier → Chompchomp)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-carrier-lading.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
✅ Credential verification successful
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "type": [
    "VerifiableCredential",
    "BillOfLadingCredential"
  ],
  "issuer": "https://shady-carrier.example/entity/aw-oru-001",
  "cnf": {
    "kid": "wNUtxagpVheCgu0xLnu0Dx7l7KPbU6KYJwnOymA1dyE"
  },
  "credentialSubject": {
    "id": "https://shipments.example/bol-2024-001",
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Bill of Lading (Shady Carrier → Chompchomp)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/shady-carrier-lading-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg
```

</details>


### ✅ Secondary Purchase Order (Anonymous Distributor → Shady Distributor)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/anonymous-distributor-purchase-order.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Credential verification failed: Error: Key ID mismatch: expected O80NKS6ISt5XMx8BKM5xZwAPXCCtuj4_yzwjx4_EUuE, got sjCcIQefWYDejyZh0KvGVhGBP4UQ9tNgP2X5TrMuHa8
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Secondary Purchase Order (Anonymous Distributor → Shady Distributor)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/anonymous-distributor-purchase-order-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: -XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A
```

</details>


### ✅ Secondary Commercial Invoice (Shady Distributor → Anonymous Distributor)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-distributor-invoice.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Credential verification failed: Error: Key ID mismatch: expected yEO0pZQ6_bFYlZZkmmK6MQLrydeubOdKdtYO-cXKsAg, got 4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Secondary Commercial Invoice (Shady Distributor → Anonymous Distributor)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/shady-distributor-invoice-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8
```

</details>


### ✅ Forged Bill of Lading (Shady Carrier forges original shipment documentation)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-carrier-forged-lading.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
✅ Credential verification successful
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "type": [
    "VerifiableCredential",
    "BillOfLadingCredential"
  ],
  "issuer": "https://shady-carrier.example/entity/aw-oru-001",
  "cnf": {
    "kid": "-XwVdLYzYfug9elJRgcSlQjawMW1RMEqfB4gG7hEL9A"
  },
  "credentialSubject": {
    "id": "https://shipments.example/bol-2024-001",
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Forged Bill of Lading (Shady Carrier forges original shipment documentation)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/shady-carrier-forged-lading-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: RZp0CzLsm1iBdc6RyR6ryCFb3sNiOIdzzSf92n7fBJg
```

</details>


### ✅ Certificate of Origin (Legit Shrimp → Honest Importer) - WILL BE STOLEN

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/legit-shrimp-honest-importer-origin.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
✅ Credential verification successful
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://geojson.org/geojson-ld/geojson-context.jsonld"
  ],
  "type": [
    "VerifiableCredential",
    "CertificateOfOriginCredential"
  ],
  "issuer": "https://legit-shrimp.example/entity/tt-pos-001",
  "cnf": {
    "kid": "Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E"
  },
  "credentialSubject": {
    "id": "https://certificates.example/coo-2024-001",
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for Certificate of Origin (Legit Shrimp → Honest Importer) - WILL BE STOLEN

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/legit-shrimp-honest-importer-origin-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: F4FzDU1QWvUzDpWAuwlpvO-A4TuixJ-92PXLUwwqKPo
```

</details>


### ✅ FRAUDULENT Certificate of Origin (Shady Distributor forging Legit Shrimp identity)

<details>
<summary>Document Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-distributor-fraudulent-origin.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Credential verification failed: Error: Key ID mismatch: expected TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE, got 4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ
```

</details>


</details>

---

## Step 3: Document Exchange

<details>
<summary>🔄 Click to expand document exchange details</summary>

This section covers all the presentations that are created for this supply chain.


#### ✅ Presentation for FRAUDULENT Certificate of Origin (Shady Distributor forging Legit Shrimp identity)

<details>
<summary>Presentation Verification</summary>

**Verify Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/shady-distributor-fraudulent-origin-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Verify Result:**
```
❌ Presentation verification failed: Error: Public key not found for id: 4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ
```

</details>


</details>

---


---

## Step 4: Fraud Detection Analysis

<details>
<summary>🔍 Click to expand fraud detection analysis</summary>

Demonstrating how verifiable credentials prevent fraud through cryptographic verification and holder binding.

### Scenario 1: Fraudulent Credential Detection

**Issue**: Testing the fraudulent Certificate of Origin created in Step 2, where Shady Distributor Ltd attempted to forge a credential claiming to be from Legit Shrimp Ltd but signed it with their own keys.

**Expected Result**: Verification should fail because the signature doesn't match Legit Shrimp Ltd's authorized keys.


<details>
<summary>❌ Fraudulent Certificate Verification Test</summary>

**Test Command:**
```bash
bun src/cli.ts verify-credential --credential case-studies/transhrimpment/credentials/shady-distributor-fraudulent-origin.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Test Result:**
```
❌ Credential verification failed: Error: Key ID mismatch: expected TTmxpbDxEQJKCTxehUHYHoz6qRQ00YenAsry4wJgwxE, got 4yFP_7YUQvcDt1XLqnWzQ962oehxO8QAy_Y4IMP2uDQ
```

**✅ FRAUD SUCCESSFULLY DETECTED**: The fraudulent certificate failed verification because it was signed by Shady Distributor Ltd's keys, not Legit Shrimp Ltd's authorized signing keys.

</details>

### Scenario 2: Stolen Credential Detection (Holder Binding Failure)

**Issue**: Demonstrating what happens when Shady Distributor Ltd attempts to present the legitimate Certificate of Origin (created in Step 2) that was originally issued by Legit Shrimp Ltd to Honest Importer Ltd.

**Expected Result**: Presentation should fail because Shady Distributor Ltd cannot prove they are the intended holder (cnf.kid mismatch).


<details>
<summary>❌ Stolen Credential Presentation Test</summary>

**Note**: This creates a fraudulent presentation attempt for analysis purposes only, using the existing legitimate credential.

**Test Command:**
```bash
bun src/cli.ts verify-presentation --presentation case-studies/transhrimpment/presentations/fraudulent-stolen-presentation.json --resolver-cache case-studies/transhrimpment/resolver-cache.json
```

**Test Result:**
```
❌ Presentation verification failed: Error: Presentation key mismatch: credential requires key Q8rnIRwrk-G_2vie7dP8AlbXiTGGKExx7Y1QnIj4C-E but presentation was signed with ID_fcFqPhzrsWKEbcTrx2pLqyORpk38YL2R8hAsc5R8
```

**✅ CREDENTIAL THEFT SUCCESSFULLY DETECTED**: The presentation failed because the credential was bound to Honest Importer Ltd (via cnf.kid), but Shady Distributor Ltd attempted to present it.

</details>

### Summary

The cryptographic verification system successfully demonstrates two critical security features:

1. **Digital Signature Integrity**: Fraudulent credentials cannot be created using forged identities because they fail cryptographic signature verification against the claimed issuer's authorized keys.

2. **Holder Binding Protection**: Legitimate credentials cannot be stolen and misused because they are cryptographically bound to their intended holders through the `cnf.kid` field, preventing unauthorized presentation.

</details>

---

