-- =====================================================
-- SCRIPT SQL SIMPLIFICADO: APENAS TABELA E POLÍTICAS
-- =====================================================
-- Execute este script se o bucket 'report-media' já existe
-- =====================================================

-- 1. CRIAÇÃO DA TABELA task_reports
CREATE TABLE IF NOT EXISTS task_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    raw_notes TEXT,
    content TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    suggested_actions JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED')),
    signed_by UUID REFERENCES users(id),
    signature_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_task_reports_task_id ON task_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_user_id ON task_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON task_reports(status);
CREATE INDEX IF NOT EXISTS idx_task_reports_updated_at ON task_reports(updated_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE task_reports ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DA TABELA
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view reports of accessible tasks" ON task_reports;
DROP POLICY IF EXISTS "Users can create reports" ON task_reports;
DROP POLICY IF EXISTS "Users can update their own draft reports" ON task_reports;
DROP POLICY IF EXISTS "Users can delete their own draft reports" ON task_reports;

-- Criar políticas
CREATE POLICY "Users can view reports of accessible tasks"
    ON task_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_reports.task_id
        )
    );

CREATE POLICY "Users can create reports"
    ON task_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft reports"
    ON task_reports FOR UPDATE
    USING (auth.uid() = user_id AND status = 'DRAFT')
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own draft reports"
    ON task_reports FOR DELETE
    USING (auth.uid() = user_id AND status = 'DRAFT');

-- 5. POLÍTICAS DE STORAGE (apenas se não existirem)
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can upload report media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view report media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Criar políticas de storage
CREATE POLICY "Users can upload report media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'report-media' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Public can view report media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'report-media');

CREATE POLICY "Users can delete their own media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'report-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
