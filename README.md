# AssisTec V6 🔧

Sistema completo de gestão de tarefas técnicas com relatórios inteligentes, integração com IA e gerenciamento de viagens.

## 🚀 Características Principais

### Gestão de Tarefas
- ✅ Múltiplas visualizações: Kanban, Calendário, Mapa e Histórico de Cliente
- 📋 Categorias de tarefas nativas e customizáveis
- 🎯 Etapas customizadas para cada tarefa
- 👥 Atribuição de responsáveis e visibilidade pública/privada
- 📎 Anexos com suporte a imagens e documentos

### Relatórios Técnicos Inteligentes
- 🤖 Geração automática com IA (Google Gemini)
- 📝 Editor unificado para relatórios parciais e finais
- 🖼️ Análise automática de imagens e documentos
- 📄 Extração de texto de PDFs, Word e Excel
- 🖨️ Impressão profissional com assinaturas
- 🔄 Sistema de reabertura de relatórios finalizados

### Gestão de Viagens
- 🗺️ Integração com mapas (Leaflet/OpenStreetMap)
- 📍 Seleção de localização por busca ou mapa interativo
- 👥 Gerenciamento de equipes e datas de viagem
- 💰 Controle de custos de viagem

### Integrações
- 🔐 Autenticação com Supabase
- 🗄️ Banco de dados PostgreSQL (Supabase)
- 🤖 IA para análise e geração de conteúdo (Google Gemini)
- 🗺️ Mapas interativos (Leaflet)

## 🛠️ Tecnologias

- **Frontend**: React 18 + Vite
- **Estilização**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **IA**: Google Gemini API
- **Mapas**: Leaflet + OpenStreetMap
- **Ícones**: Lucide React
- **PDF**: jsPDF + html2canvas
- **Documentos**: Mammoth (Word), XLSX (Excel), PDF.js

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta Supabase
- API Key do Google Gemini

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/evandrsilv/assistecapp_V6.git
cd assistecapp_V6
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Google Gemini AI
VITE_GEMINI_API_KEY=sua_chave_api_do_gemini
```

4. **Configure o banco de dados**

Execute o script SQL em seu projeto Supabase (disponível em `database/schema.sql`)

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

- **users** - Usuários do sistema
- **tasks** - Tarefas técnicas
- **custom_categories** - Categorias customizadas
- **task_reports** - Relatórios técnicos
- **activity_log** - Log de atividades
- **clients_registry** - Registro de clientes

## 📱 Uso

### Criando uma Tarefa

1. Clique no botão "Nova Tarefa"
2. Selecione o tipo de tarefa
3. Preencha os dados do cliente e descrição
4. Configure viagens (se necessário)
5. Adicione anexos
6. Salve a tarefa

### Gerando Relatórios

1. Abra uma tarefa existente
2. Marque "Necessita Relatório"
3. Clique em "Gerar Relatório Técnico"
4. Adicione notas rápidas e anexos
5. Use a IA para gerar o relatório automaticamente
6. Ajuste o status (Parcial/Final)
7. Salve ou finalize o relatório

### Visualizações

- **Kanban**: Arraste e solte tarefas entre colunas de status
- **Calendário**: Visualize tarefas por data de vencimento
- **Mapa**: Veja tarefas com localização geográfica
- **Cliente**: Histórico completo de tarefas por cliente
- **Relatórios**: Busque e visualize relatórios gerados

## 🔐 Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) no banco de dados
- Variáveis de ambiente para credenciais sensíveis
- Validação de dados no frontend e backend

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é de uso privado.

## 👤 Autor

**Evandro Silva**
- GitHub: [@evandrsilv](https://github.com/evandrsilv)

## 🙏 Agradecimentos

- Google Gemini pela API de IA
- Supabase pela infraestrutura backend
- Comunidade React e Vite

---

**Versão**: 6.0  
**Última atualização**: Janeiro 2026
