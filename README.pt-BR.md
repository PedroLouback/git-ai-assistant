<div align="center">

# Git AI Assistant

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-Instalar-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=PedroLouback.git-ai-assistant)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repositório-black?logo=github)](https://github.com/PedroLouback/git-ai-assistant)
[![License](https://img.shields.io/github/license/PedroLouback/git-ai-assistant)](https://github.com/PedroLouback/git-ai-assistant/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/PedroLouback/git-ai-assistant/publish.yml?branch=main&logo=githubactions&label=Build)](https://github.com/PedroLouback/git-ai-assistant/actions)

Gere mensagens de commit, descrições de PR e revisões de código usando modelos de IA gratuitos via OpenRouter — diretamente no VS Code.

[🇺🇸 English README](./README.md)

</div>

## ✨ Recursos

| Recurso | Descrição |
|---------|-----------|
| **🤖 Mensagens de Commit IA** | Gera mensagens de Conventional Commits baseado nas suas alterações staged |
| **📝 Descrições de PR** | Cria descrições estruturadas de PR usando GitHub CLI para buscar dados reais |
| **🔍 Revisão de Código** | Analisa suas alterações e fornece feedback categorizado |

## 📦 Instalação

### Pelo VS Code Marketplace (Recomendado)

1. Abra o VS Code
2. Vá para Extensões (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Pesquise por **"Git AI Assistant"**
4. Clique em **Instalar**

### Pelo Arquivo VSIX

1. Baixe o arquivo `.vsix` em [Releases](https://github.com/PedroLouback/git-ai-assistant/releases)
2. Instale via paleta de comandos: `Extensions: Install from VSIX`

## ⚙️ Configuração

### 1. Obtenha uma Chave API da OpenRouter

1. Acesse [OpenRouter.ai](https://openrouter.ai)
2. Cadastre-se / Entre
3. Vá para **API Keys**
4. Crie uma nova chave API

### 2. Configure a Extensão

Abra as Configurações do VS Code (`Ctrl+,` / `Cmd+,`) e pesquise por **Git AI Assistant**:

| Configuração | Padrão | Descrição |
|--------------|--------|-----------|
| `gitAiAssistant.apiKey` | `""` | **Obrigatório** - Sua chave API da OpenRouter |
| `gitAiAssistant.model` | `google/gemini-2.0-flash-exp:free` | Modelo de IA a usar (veja [modelos](https://openrouter.ai/models)) |
| `gitAiAssistant.baseBranch` | `main` | Branch base para comparação de diff da PR |
| `gitAiAssistant.language` | `pt-BR` | Idioma de saída: `en` ou `pt-BR` |
| `gitAiAssistant.useGitHubCLI` | `true` | Usar `gh` CLI para descrições de PR (requer [GitHub CLI](https://cli.github.com)) |

### Modelos Gratuitos Populares

| Modelo | Recomendado para |
|--------|------------------|
| `google/gemini-2.0-flash-exp:free` | Uso geral, rápido, alta qualidade |
| `meta/llama-3.1-405b-instruct:free` | Raciocínio complexo, revisão de código |
| `openai/gpt-4o-mini` | Confiável, equilibrado |
| `anthropic/claude-3-5-sonnet:free` | Precisão técnica |

## 🎯 Como Usar

### Gerar Mensagem de Commit

1. Stage suas alterações: `git add .`
2. Abra a Paleta de Comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Execute **Git AI: Generate Commit Message**
4. A mensagem gerada é inserida na caixa de entrada do SCM

> **Dica**: Você também pode clicar no ícone ✨ no painel de controle de origem

### Gerar Descrição de PR

**Pré-requisitos:** Instale e autentique o [GitHub CLI](https://cli.github.com) (`gh auth login`)

1. Abra a Paleta de Comandos
2. Execute **Git AI: Generate PR Description**
3. Digite o número da PR (ex: `123`) ou URL completa da PR
4. A extensão busca detalhes da PR via `gh pr view` e o diff
5. IA gera uma descrição estruturada no painel webview

> **Fallback**: Se o GitHub CLI não estiver disponível, compara a branch atual com a branch base

### Revisar Alterações

1. Abra a Paleta de Comandos
2. Execute **Git AI: Review Changes**
3. Escolha o escopo: **Alterações staged** ou **Todas as alterações**
4. O feedback de revisão aparece em um painel webview com:
   - 🔴 Problemas Críticos
   - 🟡 Sugestões
   - 🟢 Aspectos Positivos
   - 📝 Resumo

## 🖼️ Capturas de Tela

<details>
<summary>Geração de Mensagem de Commit</summary>

![Gerar Commit](https://raw.githubusercontent.com/PedroLouback/git-ai-assistant/main/resources/commit-message.gif)

</details>

<details>
<summary>Geração de Descrição de PR</summary>

![PR Description](https://raw.githubusercontent.com/PedroLouback/git-ai-assistant/main/resources/pr-description.gif)

</details>

<details>
<summary>Revisão de Código</summary>

![Code Review](https://raw.githubusercontent.com/PedroLouback/git-ai-assistant/main/resources/code-review.gif)

</details>

## 🔧 Requisitos

- **VS Code** `1.85.0` ou superior
- **Chave API OpenRouter** (registro gratuito)
- **GitHub CLI** (opcional, para recurso de descrição de PR)

## 🐛 Solução de Problemas

| Problema | Solução |
|----------|---------|
| "No staged changes found" | Execute `git add .` para stagear suas alterações |
| "API Key is required" | Configure `gitAiAssistant.apiKey` nas configurações |
| "Failed to get PR diff" | Instale e autentique GitHub CLI: `gh auth login` |
| "Empty content from model" | Tente um modelo diferente nas configurações |
| "Request timed out" | Verifique conexão, tente um diff menor |

### Como Reportar Bugs

[**Abra um relato de bug**](https://github.com/PedroLouback/git-ai-assistant/issues/new?template=bug_report.yml) com:

1. Versão da extensão
2. Versão do VS Code
3. Passos para reproduzir
4. Mensagens de erro do painel de Saída

## 🤝 Contribuindo

[**Sugira um recurso**](https://github.com/PedroLouback/git-ai-assistant/issues/new?template=feature_request.yml) • [**Reporte um bug**](https://github.com/PedroLouback/git-ai-assistant/issues/new?template=bug_report.yml)

Veja [CONTRIBUTING.md](./.github/CONTRIBUTING.md) para diretrizes de desenvolvimento.

## ⚡ Links Úteis

- [Repositório GitHub](https://github.com/PedroLouback/git-ai-assistant)
- [Reportar Issues](https://github.com/PedroLouback/git-ai-assistant/issues)
- [Contribuir](./.github/CONTRIBUTING.md)
- [Modelos OpenRouter](https://openrouter.ai/models)

---

<div align="center">

Feito com ❤️ por [PedroLouback](https://github.com/PedroLouback)

</div>