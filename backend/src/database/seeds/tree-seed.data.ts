/**
 * Seed data for Trees Module
 * Use this data for development and testing
 */

export const treeSpeciesSeedData = [
  {
    id: 1,
    common_name: 'Phượng vĩ',
    scientific_name: 'Delonix regia',
    description:
      'Cây phượng vĩ có hoa đỏ rực, thường trồng ở đường phố và công viên',
  },
  {
    id: 2,
    common_name: 'Sao đen',
    scientific_name: 'Hopea odorata',
    description: 'Cây gỗ lớn, tán rộng, thích hợp làm cây bóng mát',
  },
  {
    id: 3,
    common_name: 'Bằng lăng',
    scientific_name: 'Lagerstroemia speciosa',
    description: 'Cây có hoa tím đẹp, thường trồng làm cảnh quan đô thị',
  },
  {
    id: 4,
    common_name: 'Xà cừ',
    scientific_name: 'Khaya senegalensis',
    description: 'Cây gỗ lớn, tán rộng, chịu hạn tốt',
  },
  {
    id: 5,
    common_name: 'Muồng hoa đào',
    scientific_name: 'Cassia bakeriana',
    description: 'Cây có hoa màu hồng đào, nở vào mùa xuân',
  },
];

export const administrativeAreasSeedData = [
  {
    id: 1,
    area_name: 'Quận 1',
    parent_id: null,
  },
  {
    id: 2,
    area_name: 'Quận 3',
    parent_id: null,
  },
  {
    id: 3,
    area_name: 'Quận Bình Thạnh',
    parent_id: null,
  },
  {
    id: 4,
    area_name: 'Phường Bến Nghé',
    parent_id: 1,
  },
  {
    id: 5,
    area_name: 'Phường Bến Thành',
    parent_id: 1,
  },
];

export const treesSeedData = [
  {
    tree_code: 'Q1-BN-001',
    qr_code: 'QR-Q1-BN-001',
    species_id: 1,
    area_id: 4,
    latitude: 10.7769,
    longitude: 106.7009,
    planting_year: 2015,
    height_m: 8.5,
    trunk_diameter_cm: 45.0,
    canopy_diameter_m: 6.0,
    tilt_degree: 0,
    health_status: 'Tốt',
  },
  {
    tree_code: 'Q1-BN-002',
    qr_code: 'QR-Q1-BN-002',
    species_id: 2,
    area_id: 4,
    latitude: 10.777,
    longitude: 106.701,
    planting_year: 2016,
    height_m: 7.2,
    trunk_diameter_cm: 38.0,
    canopy_diameter_m: 5.5,
    tilt_degree: 5,
    health_status: 'Tốt',
  },
  {
    tree_code: 'Q1-BT-001',
    qr_code: 'QR-Q1-BT-001',
    species_id: 3,
    area_id: 5,
    latitude: 10.775,
    longitude: 106.699,
    planting_year: 2018,
    height_m: 5.8,
    trunk_diameter_cm: 28.0,
    canopy_diameter_m: 4.2,
    tilt_degree: 0,
    health_status: 'Yếu',
  },
  {
    tree_code: 'Q3-001',
    qr_code: 'QR-Q3-001',
    species_id: 4,
    area_id: 2,
    latitude: 10.7823,
    longitude: 106.6917,
    planting_year: 2014,
    height_m: 10.5,
    trunk_diameter_cm: 55.0,
    canopy_diameter_m: 8.0,
    tilt_degree: 3,
    health_status: 'Tốt',
  },
  {
    tree_code: 'Q3-002',
    qr_code: 'QR-Q3-002',
    species_id: 5,
    area_id: 2,
    latitude: 10.7825,
    longitude: 106.692,
    planting_year: 2019,
    height_m: 4.5,
    trunk_diameter_cm: 22.0,
    canopy_diameter_m: 3.5,
    tilt_degree: 0,
    health_status: 'Tốt',
  },
  {
    tree_code: 'QBT-001',
    qr_code: 'QR-QBT-001',
    species_id: 1,
    area_id: 3,
    latitude: 10.8142,
    longitude: 106.7054,
    planting_year: 2017,
    height_m: 6.8,
    trunk_diameter_cm: 35.0,
    canopy_diameter_m: 5.0,
    tilt_degree: 8,
    health_status: 'Sâu bệnh',
  },
];

/**
 * SQL Script to insert seed data
 * Run this after enabling PostGIS extension
 */
export const seedSQL = `
-- Insert tree species
INSERT INTO tree_species (id, common_name, scientific_name, description) VALUES
(1, 'Phượng vĩ', 'Delonix regia', 'Cây phượng vĩ có hoa đỏ rực, thường trồng ở đường phố và công viên'),
(2, 'Sao đen', 'Hopea odorata', 'Cây gỗ lớn, tán rộng, thích hợp làm cây bóng mát'),
(3, 'Bằng lăng', 'Lagerstroemia speciosa', 'Cây có hoa tím đẹp, thường trồng làm cảnh quan đô thị'),
(4, 'Xà cừ', 'Khaya senegalensis', 'Cây gỗ lớn, tán rộng, chịu hạn tốt'),
(5, 'Muồng hoa đào', 'Cassia bakeriana', 'Cây có hoa màu hồng đào, nở vào mùa xuân')
ON CONFLICT (id) DO NOTHING;

-- Insert administrative areas
INSERT INTO administrative_areas (id, area_name, parent_id) VALUES
(1, 'Quận 1', NULL),
(2, 'Quận 3', NULL),
(3, 'Quận Bình Thạnh', NULL),
(4, 'Phường Bến Nghé', 1),
(5, 'Phường Bến Thành', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert trees with PostGIS Point geometry
INSERT INTO trees (tree_code, qr_code, species_id, area_id, location, planting_year, height_m, trunk_diameter_cm, canopy_diameter_m, tilt_degree, health_status) VALUES
('Q1-BN-001', 'QR-Q1-BN-001', 1, 4, ST_GeomFromText('POINT(106.7009 10.7769)', 4326), 2015, 8.5, 45.0, 6.0, 0, 'Tốt'),
('Q1-BN-002', 'QR-Q1-BN-002', 2, 4, ST_GeomFromText('POINT(106.7010 10.7770)', 4326), 2016, 7.2, 38.0, 5.5, 5, 'Tốt'),
('Q1-BT-001', 'QR-Q1-BT-001', 3, 5, ST_GeomFromText('POINT(106.6990 10.7750)', 4326), 2018, 5.8, 28.0, 4.2, 0, 'Yếu'),
('Q3-001', 'QR-Q3-001', 4, 2, ST_GeomFromText('POINT(106.6917 10.7823)', 4326), 2014, 10.5, 55.0, 8.0, 3, 'Tốt'),
('Q3-002', 'QR-Q3-002', 5, 2, ST_GeomFromText('POINT(106.6920 10.7825)', 4326), 2019, 4.5, 22.0, 3.5, 0, 'Tốt'),
('QBT-001', 'QR-QBT-001', 1, 3, ST_GeomFromText('POINT(106.7054 10.8142)', 4326), 2017, 6.8, 35.0, 5.0, 8, 'Sâu bệnh')
ON CONFLICT (tree_code) DO NOTHING;
`;
