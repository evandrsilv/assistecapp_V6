-- ============================================================================
-- POLI - Materials and RNC Management
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MATERIALS INVENTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    quantity DECIMAL NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Kg',
    min_quantity DECIMAL DEFAULT 0,
    last_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE materials_inventory ENABLE ROW LEVEL SECURITY;

-- Simple policies for authenticated users
CREATE POLICY "Authenticated users can manage inventory" 
    ON materials_inventory FOR ALL 
    USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 2. MATERIAL PERFORMANCE HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('APPROVED', 'REJECTED')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE material_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage performance history" 
    ON material_performance FOR ALL 
    USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 3. RNC TRACKING ENHANCEMENTS (Optional fields if needed)
-- ----------------------------------------------------------------------------
-- If the tasks table doesn't have a resolution_date, we can just use updated_at
-- but a dedicated field is better for accuracy if a task is reopened.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rnc_resolution_date TIMESTAMPTZ;

-- Comments
COMMENT ON TABLE materials_inventory IS 'Stores materials and samples in stock monitored by POLI';
COMMENT ON TABLE material_performance IS 'History of material approval/rejection per client';
