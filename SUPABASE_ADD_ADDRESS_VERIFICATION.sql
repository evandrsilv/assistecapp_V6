-- Add address verification fields to clients table
-- This allows POLI to skip already-verified clients in future analyses

-- Add address_verified column (boolean, default false)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS address_verified BOOLEAN DEFAULT false;

-- Add address_verified_at column (timestamp when verification happened)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN clients.address_verified IS 'Indicates if the client address has been verified/optimized by POLI AI';
COMMENT ON COLUMN clients.address_verified_at IS 'Timestamp when the address was last verified by POLI AI';

-- Optional: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_address_verified ON clients(address_verified);
