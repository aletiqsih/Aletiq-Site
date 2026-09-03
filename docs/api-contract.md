# Aletiq REST API Contract

Base URL: `http://localhost:3000/api`

## Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & API status |
| `GET` | `/api/rules` | Fetch Legal Metrology rules with category/search filters |
| `GET` | `/api/rules/:id` | Get single rule definition |
| `GET` | `/api/inspections` | List inspection records with status/search filters |
| `POST` | `/api/inspections` | Create new draft inspection record |
| `GET` | `/api/inspections/:id` | Get inspection details with compliance results |
| `DELETE` | `/api/inspections/:id` | Delete inspection record |
| `POST` | `/api/inspections/:id/images` | Upload / attach package panel image |
| `DELETE` | `/api/inspections/:id/images/:imageId` | Delete image from inspection |
| `POST` | `/api/inspections/:id/analyze` | Execute AI multimodal extraction & rule evaluation |
| `POST` | `/api/inspections/:id/compare` | Cross-verify package against digital/e-commerce listing |
| `GET` | `/api/inspections/:id/notice` | Fetch draft Form-A Improvement Notice |
| `GET` | `/api/analytics/risk-intelligence` | Aggregated compliance metrics and risk frequencies |
| `POST` | `/api/demo/seed` | Reset / re-seed reference test cases |

---

## Detailed Payload Schemas

### POST `/api/inspections`
```json
{
  "productName": "Organic Rolled Oats",
  "brand": "NutriGrains",
  "inspectorName": "S. Sharma",
  "inspectorLocation": "Delhi Directorate",
  "batchNumber": "LOT-2026-B1",
  "retailerName": "Metro Supermart"
}
```

### POST `/api/inspections/:id/images`
```json
{
  "image": {
    "name": "package_back.jpg",
    "side": "back",
    "url": "data:image/jpeg;base64,...",
    "sizeBytes": 250000,
    "mimeType": "image/jpeg",
    "quality": {
      "isAcceptable": true,
      "blurScore": 85,
      "brightnessScore": 72,
      "glareDetected": false,
      "textLegibilityEstimated": true,
      "warnings": []
    }
  }
}
```

### POST `/api/inspections/:id/analyze`
Returns the completed `Inspection` object containing the `ComplianceResult`, score, rule-by-rule evaluations, and draft improvement notice.
