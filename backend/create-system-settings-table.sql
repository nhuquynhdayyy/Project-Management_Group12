-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) 
VALUES ('geofencing_radius_meters', '10', 'Bán kính cho phép nhân viên xác nhận hoàn thành công việc (Geofencing) - đơn vị: mét')
ON CONFLICT (key) DO NOTHING;

-- Verify
SELECT * FROM system_settings;
