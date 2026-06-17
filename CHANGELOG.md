# Changelog

All notable changes to the "GitFlare Assistant" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub CLI integration for PR description generation
- PR number/URL input for fetching real PR data
- Bilingual README (English and Portuguese)
- Issue templates for feature requests and bug reports
- Contribution guidelines
- Publisher metadata (PedroLouback)
- Code of Conduct
- GitHub Actions CI/CD for automatic publishing

### Changed
- PR description now fetches PR details and diff via `gh pr view` and `gh pr diff`
- PR description webview shows PR number in title
- Improved PR description prompt with more context (author, stats, files)
- Fixed GitHub Actions workflows to correctly publish extension and create releases

### Configuration
- New setting: `gitFlareAssistant.useGitHubCLI` (default: true) - Enable/disable GitHub CLI for PR descriptions

## [0.0.1] - Initial Release

### Added
- Generate commit messages using AI (Conventional Commits format)
- Generate PR descriptions comparing current branch with base
- Code review with categorized feedback (issues, suggestions, positives)
- Multi-language support (English, Portuguese)
- Settings for API key, model selection, and base branch