-- Add POLI interaction level to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS poli_interaction VARCHAR(20) DEFAULT 'MEDIUM' 
CHECK (poli_interaction IN ('DISABLED', 'LOW', 'MEDIUM', 'HIGH'));

COMMENT ON COLUMN users.poli_interaction IS 'Interaction level for POLI: DISABLED, LOW, MEDIUM, or HIGH';
