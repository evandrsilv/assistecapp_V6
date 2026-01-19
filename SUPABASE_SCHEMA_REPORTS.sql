-- =====================================================
-- SCRIPT SQL COMPLETO: RELATÓRIOS INTELIGENTES
-- =====================================================
-- Este script cria a tabela 'task_reports' e o bucket de storage 'report-media'
-- para o módulo de Relatórios Inteligentes do AssisTec.
--
-- INSTRUÇÕES:
-- 1. Copie todo este código
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole e execute (RUN)
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

-- Política: Usuários podem ver relatórios de tarefas que eles têm acesso
CREATE POLICY "Users can view reports of accessible tasks"
    ON task_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_reports.task_id
        )
    );

-- Política: Usuários podem criar relatórios
CREATE POLICY "Users can create reports"
    ON task_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios relatórios (apenas se DRAFT)
CREATE POLICY "Users can update their own draft reports"
    ON task_reports FOR UPDATE
    USING (auth.uid() = user_id AND status = 'DRAFT')
    WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios relatórios (apenas se DRAFT)
CREATE POLICY "Users can delete their own draft reports"
    ON task_reports FOR DELETE
    USING (auth.uid() = user_id AND status = 'DRAFT');

-- 4. CRIAÇÃO DO STORAGE BUCKET 'report-media'
-- NOTA: Este comando pode falhar se o bucket já existir. Isso é normal.
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-media', 'report-media', true)
ON CONFLICT (id) DO NOTHING;

-- 5. POLÍTICAS DE STORAGE
-- Política: Permitir upload de arquivos
CREATE POLICY "Users can upload report media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'report-media' AND
        auth.role() = 'authenticated'
    );

-- Política: Permitir leitura pública de arquivos
CREATE POLICY "Public can view report media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'report-media');

-- Política: Permitir deleção apenas do próprio usuário
CREATE POLICY "Users can delete their own media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'report-media' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- Após executar, verifique se:
-- ✓ Tabela 'task_reports' foi criada
-- ✓ Bucket 'report-media' aparece em Storage
-- ✓ Políticas RLS estão ativas
-- =====================================================
