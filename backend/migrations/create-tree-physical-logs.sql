-- Migration: Create tree_physical_logs table
-- Description: Store history of physical measurements for trees

CREATE TABLE IF NOT EXISTS tree_physical_logs (
  id SERIAL PRIMARY KEY,
  tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  height_m DECIMAL(5, 2),
  trunk_diameter_cm DECIMAL(5, 2),
  canopy_diameter_m DECIMAL(5, 2),
  tilt_degree INTEGER,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  measured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_tree_physical_logs_tree_id ON tree_physical_logs(tree_id);
CREATE INDEX idx_tree_physical_logs_measured_at ON tree_physical_logs(measured_at DESC);

-- Add comment
COMMENT ON TABLE tree_physical_logs IS 'History log of physical measurements for trees';
