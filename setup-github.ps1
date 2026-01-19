# Script automatizado para enviar o projeto ao GitHub
# Execute este script no PowerShell

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  AssisTec V6 - Setup GitHub" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
$currentPath = Get-Location
Write-Host "📁 Pasta atual: $currentPath" -ForegroundColor Yellow
Write-Host ""

# Verificar se Git está instalado
Write-Host "🔍 Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git instalado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não encontrado! Instale em: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verificar configuração do Git
Write-Host "🔍 Verificando configuração do Git..." -ForegroundColor Yellow
$userName = git config --global user.name
$userEmail = git config --global user.email

if ([string]::IsNullOrEmpty($userName) -or [string]::IsNullOrEmpty($userEmail)) {
    Write-Host "⚠️  Git não está configurado!" -ForegroundColor Yellow
    Write-Host ""
    $name = Read-Host "Digite seu nome"
    $email = Read-Host "Digite seu email (mesmo do GitHub)"
    
    git config --global user.name "$name"
    git config --global user.email "$email"
    
    Write-Host "✅ Git configurado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "✅ Nome: $userName" -ForegroundColor Green
    Write-Host "✅ Email: $userEmail" -ForegroundColor Green
}
Write-Host ""

# Inicializar repositório
Write-Host "📦 Inicializando repositório Git..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "⚠️  Repositório Git já existe!" -ForegroundColor Yellow
} else {
    git init
    Write-Host "✅ Repositório inicializado!" -ForegroundColor Green
}
Write-Host ""

# Adicionar remote
Write-Host "🔗 Configurando repositório remoto..." -ForegroundColor Yellow
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "⚠️  Remote 'origin' já existe: $remoteExists" -ForegroundColor Yellow
    $replace = Read-Host "Deseja substituir? (s/n)"
    if ($replace -eq "s") {
        git remote remove origin
        git remote add origin https://github.com/evandrsilv/assistecapp_V6.git
        Write-Host "✅ Remote atualizado!" -ForegroundColor Green
    }
} else {
    git remote add origin https://github.com/evandrsilv/assistecapp_V6.git
    Write-Host "✅ Remote configurado!" -ForegroundColor Green
}
Write-Host ""

# Verificar arquivos
Write-Host "📋 Verificando arquivos..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    Write-Host "✅ .gitignore encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ .gitignore não encontrado!" -ForegroundColor Red
}

if (Test-Path "README.md") {
    Write-Host "✅ README.md encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ README.md não encontrado!" -ForegroundColor Red
}

if (Test-Path ".env.example") {
    Write-Host "✅ .env.example encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.example não encontrado" -ForegroundColor Yellow
}
Write-Host ""

# Adicionar arquivos
Write-Host "➕ Adicionando arquivos ao Git..." -ForegroundColor Yellow
git add .
$filesAdded = git status --short | Measure-Object -Line
Write-Host "✅ $($filesAdded.Lines) arquivos adicionados" -ForegroundColor Green
Write-Host ""

# Mostrar status
Write-Host "📊 Status do repositório:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Confirmar commit
Write-Host "==================================================" -ForegroundColor Cyan
$confirm = Read-Host "Deseja fazer o commit e push? (s/n)"
if ($confirm -ne "s") {
    Write-Host "❌ Operação cancelada!" -ForegroundColor Red
    exit 0
}

# Fazer commit
Write-Host ""
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git commit -m "Initial commit - AssisTec V6"
Write-Host "✅ Commit realizado!" -ForegroundColor Green
Write-Host ""

# Renomear branch para main
Write-Host "🔄 Configurando branch main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✅ Branch configurada!" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "🚀 Enviando para o GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Você precisará autenticar!" -ForegroundColor Yellow
Write-Host "   Username: seu_usuario_github" -ForegroundColor White
Write-Host "   Password: seu_personal_access_token" -ForegroundColor White
Write-Host ""
Write-Host "   Se não tem token, crie em:" -ForegroundColor White
Write-Host "   https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host ""

$pushConfirm = Read-Host "Pressione ENTER para continuar"

try {
    git push -u origin main
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  ✅ SUCESSO! Projeto enviado ao GitHub!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Acesse: https://github.com/evandrsilv/assistecapp_V6" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push!" -ForegroundColor Red
    Write-Host "   Verifique suas credenciais e tente novamente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Para tentar novamente, execute:" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor Cyan
}
