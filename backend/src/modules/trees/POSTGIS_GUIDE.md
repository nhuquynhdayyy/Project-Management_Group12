# PostGIS Integration Guide

## GeoJSON Format for Location Data

### Important: Coordinate Order
**GeoJSON uses [longitude, latitude] order** — longitude first, latitude second.

This is the opposite of how we typically say coordinates in conversation ("21.0285° N, 105.8542° E" = latitude first), but it matches the mathematical convention of (x, y) where x = longitude and y = latitude.

### Correct Format

```typescript
// ✅ CORRECT: [longitude, latitude]
const location = {
  type: 'Point',
  coordinates: [105.8542, 21.0285]  // [lng, lat]
};
```

```typescript
// ❌ WRONG: [latitude, longitude]
const location = {
  type: 'Point',
  coordinates: [21.0285, 105.8542]  // This will place your tree in the wrong location!
};
```

### Why This Matters

If you swap the coordinates:
- Your tree will appear in the wrong location on the map
- Spatial queries (nearby trees) will return incorrect results
- The coordinates might even be invalid (latitude > 90° or longitude > 180°)

### Example: Đà Nẵng Coordinates

```typescript
// Đà Nẵng City Hall
const daNangCityHall = {
  type: 'Point',
  coordinates: [108.2022, 16.0544]  // [longitude, latitude]
};

// Breakdown:
// - Longitude: 108.2022° E (east-west position)
// - Latitude:  16.0544° N  (north-south position)
```

## TypeORM Entity Definition

```typescript
@Column({
  type: 'geometry',
  spatialFeatureType: 'Point',
  srid: 4326,  // WGS84 coordinate system
})
location: {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
} | string;
```

## Creating a Tree with Location

```typescript
const tree = await treesService.create({
  tree_code: 'DN-LC-001',
  species_id: 1,
  area_id: 1,
  latitude: 16.0544,   // Input as separate values
  longitude: 108.2022,
  // ... other fields
});

// Service converts to GeoJSON:
// location = { type: 'Point', coordinates: [108.2022, 16.0544] }
```

## PostGIS Queries

### Find Trees Within Radius

```typescript
// Find trees within 100 meters of a point
const nearbyTrees = await treesService.findTreesWithinRadius({
  latitude: 16.0544,
  longitude: 108.2022,
  radius_meters: 100
});
```

### Raw SQL Example

```sql
-- Find trees within 100 meters
SELECT 
  id,
  tree_code,
  ST_AsText(location) as location_wkt,
  ST_Distance(
    location::geography,
    ST_GeomFromText('POINT(108.2022 16.0544)', 4326)::geography
  ) as distance_meters
FROM trees
WHERE ST_DWithin(
  location::geography,
  ST_GeomFromText('POINT(108.2022 16.0544)', 4326)::geography,
  100  -- radius in meters
)
ORDER BY distance_meters;
```

## Common Pitfalls

### 1. Coordinate Order Confusion

```typescript
// ❌ WRONG
const location = {
  type: 'Point',
  coordinates: [latitude, longitude]  // Backwards!
};

// ✅ CORRECT
const location = {
  type: 'Point',
  coordinates: [longitude, latitude]  // Longitude first!
};
```

### 2. Using WKT String Instead of GeoJSON

```typescript
// ❌ WRONG - TypeORM expects GeoJSON object
const location = `POINT(${longitude} ${latitude})`;

// ✅ CORRECT - GeoJSON object
const location = {
  type: 'Point',
  coordinates: [longitude, latitude]
};
```

### 3. Forgetting SRID in Raw Queries

```sql
-- ❌ WRONG - No SRID specified
ST_GeomFromText('POINT(108.2022 16.0544)')

-- ✅ CORRECT - SRID 4326 (WGS84)
ST_GeomFromText('POINT(108.2022 16.0544)', 4326)
```

## Testing Your Coordinates

### Quick Validation

```typescript
// Valid longitude: -180 to 180
// Valid latitude:  -90 to 90

function isValidCoordinate(lng: number, lat: number): boolean {
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

// Đà Nẵng should be around:
// Longitude: 108° E (positive, east of Prime Meridian)
// Latitude:  16° N  (positive, north of Equator)
```

### Visual Check

Use [geojson.io](https://geojson.io) to visualize your coordinates:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [108.2022, 16.0544]
  },
  "properties": {
    "name": "Test Tree"
  }
}
```

If the point appears in the ocean or wrong country, your coordinates are swapped!

## Reference

- **SRID 4326**: WGS84 coordinate system (GPS standard)
- **Geography vs Geometry**: Use `::geography` for meter-based distance calculations
- **GeoJSON Spec**: https://geojson.org/
- **PostGIS Docs**: https://postgis.net/docs/

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  GeoJSON Point Format                           │
├─────────────────────────────────────────────────┤
│  {                                              │
│    type: 'Point',                               │
│    coordinates: [longitude, latitude]           │
│  }                                              │
│                                                 │
│  Remember: [lng, lat] = [x, y]                  │
│                                                 │
│  Đà Nẵng Example:                               │
│  coordinates: [108.2022, 16.0544]               │
│                ↑         ↑                      │
│                lng       lat                    │
└─────────────────────────────────────────────────┘
```
