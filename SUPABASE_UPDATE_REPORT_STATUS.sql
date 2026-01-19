-- =====================================================
-- SOLUÇÃO ALTERNATIVA: STATUS SEM CONSTRAINT
-- =====================================================
-- Este script remove a constraint e usa DEFAULT ao invés
-- =====================================================

-- 1. Remover constraint de status (se existir)
ALTER TABLE task_reports DROP CONSTRAINT IF EXISTS task_reports_status_check;

-- 2. Atualizar todos os registros existentes para garantir valores válidos
UPDATE task_reports SET status = 'EM_ABERTO' WHERE status IS NULL OR status = '' OR status = 'DRAFT';
UPDATE task_reports SET status = 'FINALIZADO' WHERE status = 'FINALIZED';

-- 3. Definir valor padrão para a coluna status
ALTER TABLE task_reports ALTER COLUMN status SET DEFAULT 'EM_ABERTO';

-- 4. Garantir que a coluna não aceite NULL
ALTER TABLE task_reports ALTER COLUMN status SET NOT NULL;

-- 5. Adicionar campos para rastreamento de reabertura (se não existirem)
ALTER TABLE task_reports ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
ALTER TABLE task_reports ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES users(id);

-- =====================================================
-- VERIFICAÇÃO (opcional - rode depois para conferir)
-- =====================================================
-- SELECT status, COUNT(*) FROM task_reports GROUP BY status;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
