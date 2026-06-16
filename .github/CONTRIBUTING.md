# Contributing to Git AI Assistant

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- Git
- GitHub CLI (`gh`) for PR description feature development

### Development Setup

```bash
# Clone the repository
git clone https://github.com/PedroLouback/git-ai-assistant.git
cd git-ai-assistant

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Open in VS Code
code .
```

### Running the Extension

1. Press `F5` in VS Code to launch a new Extension Development Host window
2. The extension will be loaded and ready to test
3. Open a Git repository in the new window to test commands

## Project Structure

```
src/
├── extension.ts          # Extension entry point
├── config.ts             # Configuration management
├── openrouter.ts         # OpenRouter API client
├── gitService.ts         # Git operations (local + GitHub CLI)
├── commands/
│   ├── commitMessage.ts  # Generate commit messages
│   ├── prDescription.ts  # Generate PR descriptions (NEW: uses GitHub CLI)
│   └── reviewChanges.ts  # Code review
```

## Making Changes

### Code Style

- Follow existing TypeScript patterns in the codebase
- Use `async/await` for asynchronous operations
- Handle errors gracefully with user-friendly messages
- Keep functions small and focused

### Commands

Each command follows this pattern:
1. Validate configuration
2. Show progress indicator
3. Gather required data (git diff, PR info, etc.)
4. Call OpenRouter API
5. Display results in webview panel

### Configuration

Add new settings in:
1. `package.json` → `contributes.configuration.properties`
2. `src/config.ts` → `ExtensionConfig` interface and `getConfig()`

## Testing

### Manual Testing

Test all three commands:
- `Git AI: Generate Commit Message` (with staged changes)
- `Git AI: Generate PR Description` (with PR number)
- `Git AI: Review Changes` (staged/all changes)

### Test Scenarios

- Single repo and multi-repo workspaces
- Different base branches (main, master, develop)
- Both languages (en, pt-BR)
- With and without GitHub CLI installed
- Various diff sizes

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feature/your-feature-name`
3. **Make changes** with clear, focused commits
4. **Test thoroughly** in the Extension Development Host
5. **Update documentation** if needed (README, CHANGELOG)
6. **Submit PR** with clear description

### PR Requirements

- [ ] Code compiles without errors (`npm run compile`)
- [ ] All existing functionality works
- [ ] New features have appropriate tests (if applicable)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (under [Unreleased])

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add GitHub CLI integration for PR descriptions`
- `fix: handle empty diff in commit message generation`
- `docs: update README with new configuration options`
- `refactor: simplify git service functions`

## Issue Triage

- **Bug reports**: Reproduce, fix, add regression test
- **Feature requests**: Discuss feasibility, design, then implement
- **Questions**: Answer in issue, consider adding to FAQ

## Code of Conduct

Be respectful, inclusive, and constructive. See [GitHub Community Guidelines](https://docs.github.com/en/site-policy/github-terms/github-community-guidelines).

## Questions?

Open a [Discussion](https://github.com/PedroLouback/git-ai-assistant/discussions) or [Issue](https://github.com/PedroLouback/git-ai-assistant/issues/new/choose).