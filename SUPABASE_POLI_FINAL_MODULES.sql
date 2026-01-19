-- ============================================================================
-- POLI - Final Modules: Knowledge, Performance, and After-Sales
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLIENT CLASSIFICATION & AFTER-SALES
-- ----------------------------------------------------------------------------
-- Classification based on revenue/importance
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS classification VARCHAR(10) DEFAULT 'BRONZE' CHECK (classification IN ('OURO', 'PRATA', 'BRONZE'));

-- Track last visit date specifically for POS-VENDA
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS last_pos_venda_at TIMESTAMPTZ;

COMMENT ON COLUMN clients.classification IS 'Client category by revenue: OURO, PRATA, BRONZE';
COMMENT ON COLUMN clients.last_pos_venda_at IS 'Date of the last after-sales (pós-venda) visit';

-- ----------------------------------------------------------------------------
-- 2. TEAM PERFORMANCE & TASK OUTCOMES
-- ----------------------------------------------------------------------------
-- Track if a development task was successful
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS outcome VARCHAR(20) CHECK (outcome IN ('SUCCESS', 'FAILURE', 'PARTIAL'));

COMMENT ON COLUMN tasks.outcome IS 'Result of the task (especially for Development/Tests): SUCCESS, FAILURE, PARTIAL';

-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE ANALYSIS
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_category_status ON tasks(category, status);
CREATE INDEX IF NOT EXISTS idx_clients_classification ON clients(classification);

-- ----------------------------------------------------------------------------
-- 4. SAMPLE CLASSIFICATION UPDATE (Optional)
-- ----------------------------------------------------------------------------
-- Example: UPDATE clients SET classification = 'OURO' WHERE name LIKE '%Grande Empresa%';
