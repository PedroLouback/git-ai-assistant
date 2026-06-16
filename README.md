<div align="center">

# Git AI Assistant

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-Install-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=PedroLouback.git-ai-assistant)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-black?logo=github)](https://github.com/PedroLouback/git-ai-assistant)
[![License](https://img.shields.io/github/license/PedroLouback/git-ai-assistant)](https://github.com/PedroLouback/git-ai-assistant/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/PedroLouback/git-ai-assistant/publish.yml?branch=main&logo=githubactions&label=Build)](https://github.com/PedroLouback/git-ai-assistant/actions)

Generate commit messages, PR descriptions, and code reviews using free AI models via OpenRouter — directly in VS Code.

[🇧🇷 README em Português](./README.pt-BR.md)

</div>

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🤖 AI Commit Messages** | Generates Conventional Commits messages based on your staged changes |
| **📝 PR Descriptions** | Creates structured PR descriptions using GitHub CLI to fetch real PR data |
| **🔍 Code Review** | Analyzes your code changes and provides categorized feedback |

## 📦 Installation

### From VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"Git AI Assistant"**
4. Click **Install**

### From VSIX File

1. Download the `.vsix` file from [Releases](https://github.com/PedroLouback/git-ai-assistant/releases)
2. Install via command palette: `Extensions: Install from VSIX`

## ⚙️ Configuration

### 1. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up / Log in
3. Go to **API Keys** section
4. Create a new API key

### 2. Configure Extension

Open VS Code Settings (`Ctrl+,` / `Cmd+,`) and search for **Git AI Assistant**:

| Setting | Default | Description |
|---------|---------|-------------|
| `gitAiAssistant.apiKey` | `""` | **Required** - Your OpenRouter API key |
| `gitAiAssistant.model` | `google/gemini-2.0-flash-exp:free` | AI model to use (see [models](https://openrouter.ai/models)) |
| `gitAiAssistant.baseBranch` | `main` | Base branch for PR diff comparison |
| `gitAiAssistant.language` | `en` | Output language: `en` or `pt-BR` |
| `gitAiAssistant.useGitHubCLI` | `true` | Use `gh` CLI for PR descriptions (requires [GitHub CLI](https://cli.github.com)) |

### Popular Free Models

| Model | Recommended For |
|-------|-----------------|
| `google/gemini-2.0-flash-exp:free` | General use, fast, high quality |
| `meta/llama-3.1-405b-instruct:free` | Complex reasoning, code review |
| `openai/gpt-4o-mini` | Reliable, well-balanced |
| `anthropic/claude-3-5-sonnet:free` | Technical accuracy |

## 🎯 Usage

### Generate Commit Message

1. Stage your changes: `git add .`
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run **Git AI: Generate Commit Message**
4. The generated message is inserted into the SCM input box

> **Tip**: You can also click the ✨ icon in the Source Control panel toolbar

### Generate PR Description

**Prerequisites:** Install and authenticate [GitHub CLI](https://cli.github.com) (`gh auth login`)

1. Open Command Palette
2. Run **Git AI: Generate PR Description**
3. Enter your PR number (e.g., `123`) or full PR URL
4. The extension fetches PR details via `gh pr view` and the diff
5. AI generates a structured description in the webview panel

> **Fallback**: If GitHub CLI isn't available, compares current branch with base branch

### Review Changes

1. Open Command Palette
2. Run **Git AI: Review Changes**
3. Choose scope: **Staged changes** or **All changes**
4. Review feedback appears in a webview panel with:
   - 🔴 Critical Issues
   - 🟡 Suggestions
   - 🟢 Positive Aspects
   - 📝 Summary

## 🖼️ Screenshots

<details>
<summary>Commit Message Generation</summary>

![Generate Commit Message](https://raw.githubusercontent.com/PedroLouback/git-ai-assistant/main/resources/commit-message.gif)

</details>

<details>
<summary>PR Description Generation</summary>

![PR Description](https://raw.githubusercontent.com/PedroLouback/git-ai-assistant/main/resources/pr-description.gif)

</details>

<details>
<summary>Code Review</summary>

![Code Review](https://raw.githubusercontent.com/PedroLouback/git-ai-assistant/main/resources/code-review.gif)

</details>

## 🔧 Requirements

- **VS Code** `1.85.0` or higher
- **OpenRouter API Key** (free registration)
- **GitHub CLI** (optional, for PR description feature)

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "No staged changes found" | Run `git add .` to stage your changes |
| "API Key is required" | Configure `gitAiAssistant.apiKey` in settings |
| "Failed to get PR diff" | Install and authenticate GitHub CLI: `gh auth login` |
| "Empty content from model" | Try a different model in settings |
| "Request timed out" | Check internet connection, try a smaller diff |

### How to Report Bugs

[**Open a bug report**](https://github.com/PedroLouback/git-ai-assistant/issues/new?template=bug_report.yml) with:

1. Extension version
2. VS Code version
3. Steps to reproduce
4. Error messages from Output panel

## 🤝 Contributing

[**Suggest a feature**](https://github.com/PedroLouback/git-ai-assistant/issues/new?template=feature_request.yml) • [**Report a bug**](https://github.com/PedroLouback/git-ai-assistant/issues/new?template=bug_report.yml)

See [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for development guidelines.

## ⚡ Quick Links

- [GitHub Repository](https://github.com/PedroLouback/git-ai-assistant)
- [Report Issues](https://github.com/PedroLouback/git-ai-assistant/issues)
- [Contribute](./.github/CONTRIBUTING.md)
- [OpenRouter Models](https://openrouter.ai/models)

---

<div align="center">

Made with ❤️ by [PedroLouback](https://github.com/PedroLouback)

</div>