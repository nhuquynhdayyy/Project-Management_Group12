# PostGIS "Unknown GeoJSON Type" Error - Fix Summary

## Problem

When creating a tree, the application threw:
```
QueryFailedError: unknown GeoJSON type
```

## Root Cause

The service was passing a WKT (Well-Known Text) string to TypeORM:
```typescript
// ❌ WRONG - WKT string
const location = `POINT(${longitude} ${latitude})`;
```

TypeORM's PostGIS integration expects a **GeoJSON object**, not a WKT string.

## Solution

### 1. Updated Entity Type (`tree.entity.ts`)

Changed the `location` column type from `string` to accept GeoJSON objects:

```typescript
// Before
location: string;

// After
location: {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
} | string;
```

### 2. Updated Service (`trees.service.ts`)

Changed the location creation to use proper GeoJSON format:

```typescript
// Before
const location = `POINT(${createTreeDto.longitude} ${createTreeDto.latitude})`;

// After
const location = {
  type: 'Point' as const,
  coordinates: [createTreeDto.longitude, createTreeDto.latitude],
};
```

**Critical Note:** GeoJSON uses `[longitude, latitude]` order (longitude first, latitude second).

### 3. Updated Tests (`trees.service.spec.ts`)

Updated mock objects to use GeoJSON format:

```typescript
// Before
location: `POINT(${longitude} ${latitude})`

// After
location: {
  type: 'Point' as const,
  coordinates: [longitude, latitude],
}
```

## Files Changed

1. `backend/src/entities/tree.entity.ts` - Updated location type
2. `backend/src/modules/trees/trees.service.ts` - Changed to GeoJSON format
3. `backend/src/modules/trees/trees.service.spec.ts` - Updated test mocks
4. `backend/src/modules/trees/POSTGIS_GUIDE.md` - Created comprehensive guide

## How TypeORM Handles This

When you save a tree with:
```typescript
location: {
  type: 'Point',
  coordinates: [108.2022, 16.0544]
}
```

TypeORM automatically:
1. Converts the GeoJSON object to PostGIS geometry
2. Stores it in the database as a native PostGIS Point
3. Applies the SRID 4326 (WGS84) coordinate system

When you query the tree back:
- TypeORM returns the location as a GeoJSON object
- You can use PostGIS functions in raw queries (ST_Distance, ST_DWithin, etc.)

## Testing

All 14 tests pass:
```
Test Suites: 2 passed, 2 total
Tests:       14 passed, 14 total
```

## Example Usage

### Creating a Tree

```typescript
POST /trees
{
  "tree_code": "DN-LC-001",
  "species_id": 1,
  "area_id": 1,
  "latitude": 16.0544,
  "longitude": 108.2022,
  "planting_year": 2023,
  "height_m": 5.5,
  "trunk_diameter_cm": 30.0,
  "health_status": "Tốt"
}
```

The service converts this to:
```typescript
location: {
  type: 'Point',
  coordinates: [108.2022, 16.0544]  // [lng, lat]
}
```

### Finding Nearby Trees

```typescript
GET /trees/nearby?latitude=16.0544&longitude=108.2022&radius_meters=100
```

Returns trees within 100 meters, ordered by distance.

## Important Reminders

### 1. Coordinate Order
**Always use [longitude, latitude] in GeoJSON** — this is the opposite of how we say coordinates verbally.

```typescript
// ✅ CORRECT
coordinates: [108.2022, 16.0544]  // [lng, lat]

// ❌ WRONG
coordinates: [16.0544, 108.2022]  // [lat, lng] - BACKWARDS!
```

### 2. Valid Ranges
- Longitude: -180 to 180 (east-west)
- Latitude: -90 to 90 (north-south)

### 3. Đà Nẵng Reference
- Longitude: ~108° E (positive, east of Prime Meridian)
- Latitude: ~16° N (positive, north of Equator)

If your tree appears in the ocean or wrong country, coordinates are swapped!

## Additional Resources

See `backend/src/modules/trees/POSTGIS_GUIDE.md` for:
- Detailed GeoJSON format explanation
- Common pitfalls and how to avoid them
- PostGIS query examples
- Coordinate validation tips
- Visual testing with geojson.io

## Status

✅ **FIXED** - Application now correctly handles PostGIS Point geometry using GeoJSON format.
