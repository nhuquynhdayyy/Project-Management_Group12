# Trees Module - Sprint 3

## Overview
This module implements the Tree Management functionality for the Urban Green Infrastructure Management System, following Test-Driven Development (TDD) principles.

## Features Implemented

### 1. Entities
- **Tree Entity** (`tree.entity.ts`): Main entity storing tree information with PostGIS spatial support
- **TreeSpecies Entity** (`tree-species.entity.ts`): Catalog of tree species
- **AdministrativeArea Entity** (`administrative-area.entity.ts`): Administrative boundaries for tree management

### 2. Key Functionality

#### Create Tree
- Validates required fields (tree_code, species_id, area_id, coordinates)
- Verifies species and area existence
- Stores GPS coordinates as PostGIS Point geometry
- Supports optional fields: planting_year, height, diameter, health status

#### Find Trees Within Radius (PostGIS)
- Uses PostGIS `ST_DWithin` for efficient spatial queries
- Calculates distance in meters using geography type
- Returns trees sorted by distance
- Critical feature for field worker mobile app

#### Find Tree by ID
- Retrieves single tree with eager-loaded relationships

#### Find All Trees
- Returns all trees in the system

## Database Schema

### Trees Table
Based on document pages 42-43:

| Field | Type | Description |
|-------|------|-------------|
| id | int(11) | Primary key |
| tree_code | varchar(100) | Unique tree identifier |
| qr_code | varchar(100) | QR code for mobile scanning |
| species_id | int(11) | Foreign key to tree_species |
| area_id | int(11) | Foreign key to administrative_areas |
| location | point | GPS coordinates (PostGIS) |
| planting_year | int(11) | Year tree was planted |
| height_m | decimal(5,2) | Height in meters |
| trunk_diameter_cm | decimal(5,2) | Trunk diameter in cm |
| canopy_diameter_m | decimal(5,2) | Canopy diameter in meters |
| tilt_degree | int(11) | Tree tilt angle |
| health_status | varchar(100) | Health status enum |
| last_maintained_at | timestamp | Last maintenance date |
| created_by | int(11) | User who created record |

### Health Status Enum
- Tốt (Good)
- Yếu (Weak)
- Sâu bệnh (Diseased)
- Chết (Dead)

## API Endpoints

### POST /trees
Create a new tree record.

**Request Body:**
```json
{
  "tree_code": "TREE001",
  "species_id": 1,
  "area_id": 1,
  "latitude": 21.0285,
  "longitude": 105.8542,
  "planting_year": 2020,
  "height_m": 5.5,
  "trunk_diameter_cm": 30.0,
  "health_status": "Tốt"
}
```

### GET /trees
Get all trees.

### GET /trees/:id
Get a specific tree by ID.

### GET /trees/nearby
Find trees within a radius (PostGIS spatial query).

**Query Parameters:**
- `latitude`: number
- `longitude`: number
- `radius_meters`: number

**Example:**
```
GET /trees/nearby?latitude=21.0285&longitude=105.8542&radius_meters=100
```

## TDD Implementation

### Test Coverage: 100%
All tests written BEFORE implementation (Red-Green-Refactor cycle).

### Service Tests (`trees.service.spec.ts`)
1. ✅ should create a tree with valid data
2. ✅ should fail if tree_code is missing
3. ✅ should fail if species does not exist
4. ✅ should fail if area does not exist
5. ✅ should find trees within radius
6. ✅ should return empty array when no trees found within radius
7. ✅ should order results by distance
8. ✅ should find a tree by id
9. ✅ should return null when tree not found
10. ✅ should return all trees

### Controller Tests (`trees.controller.spec.ts`)
1. ✅ should create a new tree
2. ✅ should return an array of trees
3. ✅ should return a single tree by id
4. ✅ should return trees within specified radius

## PostGIS Setup

### Prerequisites
Ensure PostgreSQL has PostGIS extension enabled:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Spatial Queries
The module uses PostGIS functions:
- `ST_GeomFromText`: Convert WKT to geometry
- `ST_DWithin`: Find geometries within distance
- `ST_Distance`: Calculate distance between geometries
- `::geography`: Cast to geography type for meter-based calculations

## Running Tests

```bash
# Run all tree tests
npm run test -- trees

# Run with coverage
npm run test:cov -- trees

# Watch mode
npm run test:watch -- trees
```

## Next Steps

### Sprint 4 Recommendations:
1. Implement Tree Growth Logs module
2. Add Tree Images module with cloud storage
3. Implement Maintenance Tasks module
4. Add Incident Reports module

## Notes

- All coordinates use SRID 4326 (WGS84)
- Distance calculations use geography type for accuracy
- Authentication required via JWT (JwtAuthGuard)
- Follows immutability principles (no in-place mutations)
- Error handling with proper HTTP status codes
