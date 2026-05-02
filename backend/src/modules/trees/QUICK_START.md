# Trees Module - Quick Start Guide

## Prerequisites

1. **PostgreSQL with PostGIS**
   ```sql
   -- Connect to your database
   psql -U postgres -d urban_tree
   
   -- Enable PostGIS extension
   CREATE EXTENSION IF NOT EXISTS postgis;
   
   -- Verify installation
   SELECT PostGIS_version();
   ```

2. **Environment Variables**
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=123456
   DB_NAME=urban_tree
   ```

## Installation

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Run Migrations** (TypeORM will auto-create tables)
   ```bash
   npm run start:dev
   ```

3. **Seed Database** (Optional)
   ```sql
   -- Run the SQL from backend/src/database/seeds/tree-seed.data.ts
   -- This will create sample species, areas, and trees
   ```

## Running Tests

```bash
# Run all tree tests
npm run test -- trees

# Run with coverage
npm run test:cov -- trees

# Watch mode for development
npm run test:watch -- trees
```

## API Usage Examples

### 1. Authentication First
All endpoints require JWT authentication.

```bash
# Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'

# Response: { "access_token": "eyJhbGc..." }
```

### 2. Create a Tree

```bash
curl -X POST http://localhost:3000/trees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tree_code": "Q1-BN-001",
    "qr_code": "QR-Q1-BN-001",
    "species_id": 1,
    "area_id": 1,
    "latitude": 10.7769,
    "longitude": 106.7009,
    "planting_year": 2020,
    "height_m": 5.5,
    "trunk_diameter_cm": 30.0,
    "canopy_diameter_m": 4.5,
    "health_status": "Tốt"
  }'
```

### 3. Get All Trees

```bash
curl -X GET http://localhost:3000/trees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Get Tree by ID

```bash
curl -X GET http://localhost:3000/trees/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Find Trees Within Radius (PostGIS)

```bash
# Find all trees within 100 meters of a location
curl -X GET "http://localhost:3000/trees/nearby?latitude=10.7769&longitude=106.7009&radius_meters=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "tree_id": 1,
    "tree_tree_code": "Q1-BN-001",
    "tree_species_id": 1,
    "tree_area_id": 1,
    "tree_height_m": "5.50",
    "tree_health_status": "Tốt",
    "location": "POINT(106.7009 10.7769)",
    "distance": 0
  },
  {
    "tree_id": 2,
    "tree_tree_code": "Q1-BN-002",
    "tree_species_id": 2,
    "tree_area_id": 1,
    "tree_height_m": "7.20",
    "tree_health_status": "Tốt",
    "location": "POINT(106.7010 10.7770)",
    "distance": 15.7
  }
]
```

## Common Use Cases

### Use Case 1: Field Worker Scans QR Code
```javascript
// Mobile app scans QR code and gets tree_code
const treeCode = "Q1-BN-001";

// Find tree by code (you'll need to add this endpoint or filter)
const response = await fetch(`/trees?tree_code=${treeCode}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Use Case 2: Find Nearby Trees for Maintenance
```javascript
// Get user's current location
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  
  // Find trees within 50 meters
  const response = await fetch(
    `/trees/nearby?latitude=${latitude}&longitude=${longitude}&radius_meters=50`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  const nearbyTrees = await response.json();
  console.log(`Found ${nearbyTrees.length} trees nearby`);
});
```

### Use Case 3: Create Tree from Mobile Survey
```javascript
// Field worker collects data
const treeData = {
  tree_code: generateTreeCode(), // e.g., "Q1-BN-003"
  qr_code: generateQRCode(),
  species_id: selectedSpecies.id,
  area_id: currentArea.id,
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  planting_year: new Date().getFullYear(),
  height_m: measurementData.height,
  trunk_diameter_cm: measurementData.diameter,
  health_status: assessmentData.health,
  created_by: currentUser.id
};

// Submit to API
const response = await fetch('/trees', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(treeData)
});
```

## Testing PostGIS Queries

### Test Spatial Query in PostgreSQL
```sql
-- Find trees within 100 meters of a point
SELECT 
  id,
  tree_code,
  ST_AsText(location) as location,
  ST_Distance(
    location::geography,
    ST_GeomFromText('POINT(106.7009 10.7769)', 4326)::geography
  ) as distance_meters
FROM trees
WHERE ST_DWithin(
  location::geography,
  ST_GeomFromText('POINT(106.7009 10.7769)', 4326)::geography,
  100
)
ORDER BY distance_meters;
```

### Verify Tree Location
```sql
-- Check if tree coordinates are valid
SELECT 
  id,
  tree_code,
  ST_AsText(location) as wkt,
  ST_X(location) as longitude,
  ST_Y(location) as latitude,
  ST_SRID(location) as srid
FROM trees
WHERE id = 1;
```

## Troubleshooting

### Issue: PostGIS extension not found
```sql
-- Install PostGIS (Ubuntu/Debian)
sudo apt-get install postgresql-14-postgis-3

-- Then enable in database
CREATE EXTENSION postgis;
```

### Issue: Tests failing
```bash
# Clear Jest cache
npm run test -- --clearCache

# Run tests with verbose output
npm run test -- trees --verbose
```

### Issue: TypeORM not creating spatial columns
Make sure your TypeORM version supports spatial types:
```json
{
  "typeorm": "^0.3.24"
}
```

## Performance Tips

1. **Add Spatial Index**
   ```sql
   CREATE INDEX idx_trees_location 
   ON trees USING GIST (location);
   ```

2. **Use Geography Type for Distance**
   - Always cast to `::geography` for meter-based calculations
   - Use `::geometry` only for coordinate operations

3. **Limit Radius Searches**
   - Set reasonable maximum radius (e.g., 1000 meters)
   - Add pagination for large result sets

## Next Steps

1. ✅ Module is ready for integration
2. 📱 Connect to mobile app
3. 🗺️ Add map visualization
4. 📊 Implement analytics dashboard
5. 🔔 Add real-time notifications

## Support

For issues or questions:
1. Check the main README: `backend/src/modules/trees/README.md`
2. Review test cases for usage examples
3. Check Sprint 3 summary: `backend/SPRINT_3_SUMMARY.md`

---

**Happy Coding! 🌳**
