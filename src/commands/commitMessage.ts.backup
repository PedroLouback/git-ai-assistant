import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig, validateConfig, openSettings } from '../config';
import { callOpenRouter } from '../openrouter';
import { getStagedDiff } from '../gitService';

// Retorna a API Git do VS Code
function getGitAPI(): any {
  return vscode.extensions.getExtension('vscode.git')?.exports?.getAPI(1);
}

// Abre um QuickPick para o usuário escolher o repositório
async function pickRepository(gitAPI: any): Promise<string | undefined> {
  const repos: any[] = gitAPI?.repositories ?? [];

  if (repos.length === 0) {
    throw new Error('No Git repositories found in workspace.');
  }

  // Só um repo: usa direto, sem perguntar
  if (repos.length === 1) {
    return repos[0].rootUri.fsPath;
  }

  const items = repos.map((r: any) => ({
    label: `$(repo) ${path.basename(r.rootUri.fsPath)}`,
    description: r.rootUri.fsPath,
    repoPath: r.rootUri.fsPath,
    // Mostra a branch atual ao lado do nome
    detail: `Branch: ${r.state?.HEAD?.name ?? 'unknown'}`
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select repository to generate commit message for',
    matchOnDescription: true
  });

  return picked?.repoPath;
}

// Seta a mensagem no input box do repositório correto
function setCommitMessage(gitAPI: any, repoPath: string, message: string): void {
  const repo = gitAPI?.repositories?.find(
    (r: any) => r.rootUri.fsPath === repoPath
  );
  if (repo) {
    repo.inputBox.value = message;
  }
}

// Comando principal — sourceControl é passado automaticamente quando
// o ícone do SCM title é clicado; é undefined quando chamado pelo Command Palette
export async function generateCommitMessage(sourceControl?: vscode.SourceControl): Promise<void> {
  const config = getConfig();
  const error = validateConfig(config);
  if (error) {
    const action = await vscode.window.showErrorMessage(error, 'Open Settings');
    if (action === 'Open Settings') { openSettings(); }
    return;
  }

  const gitAPI = getGitAPI();
  let repoPath: string | undefined;

  if (sourceControl?.rootUri) {
    // Clicou no ícone de um repo específico no painel SCM
    repoPath = sourceControl.rootUri.fsPath;
  } else {
    // Chamado pelo Command Palette — pergunta qual repo (ou usa o único disponível)
    try {
      repoPath = await pickRepository(gitAPI);
    } catch (err: any) {
      vscode.window.showErrorMessage(err.message);
      return;
    }
  }

  if (!repoPath) { return; } // usuário cancelou o QuickPick

  const repoName = path.basename(repoPath);

await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: `GitFlare: Generating commit message for ${repoName}...`,
			cancellable: false
		},
    async () => {
      try {
        let diff: string;
        try {
          diff = await getStagedDiff(repoPath!);
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to get staged changes: ${err.message}`);
          return;
        }

        if (!diff || diff.length < 10) {
          vscode.window.showWarningMessage(
            `No staged changes found in ${repoName}. Stage your changes first.`
          );
          return;
        }

        const truncatedDiff = diff.slice(0, 8000);

        const systemPrompt = config.language === 'pt-BR'
          ? 'Gere APENAS uma linha de mensagem de commit no formato Conventional Commits. Exemplo: "feat(extension): add github cli integration for pr descriptions". NÃO escreva nada além da mensagem. APENAS a linha.'
          : 'Generate ONLY one line of commit message in Conventional Commits format. Example: "feat(extension): add github cli integration for pr descriptions". Do NOT write anything beyond the message. ONLY the line.';

        let commitMessage: string;
        try {
          commitMessage = await callOpenRouter({
            apiKey: config.apiKey,
            model: config.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: truncatedDiff }
            ],
            maxTokens: 80,
            temperature: 0.1
          });
          commitMessage = commitMessage.trim();
          commitMessage = validateCommitMessage(commitMessage, config.language);
        } catch (err: any) {
          vscode.window.showErrorMessage(`OpenRouter API error: ${err.message}`);
          return;
        }

        // Seta no input box do repositório correto
        setCommitMessage(gitAPI, repoPath!, commitMessage);

        const action = await vscode.window.showInformationMessage(
          `✅ Commit message generated for ${repoName}!`,
          'Copy'
        );
        if (action === 'Copy') {
          await vscode.env.clipboard.writeText(commitMessage);
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`Unexpected error: ${err.message}`);
      }
    }
  );
}

function validateCommitMessage(message: string, language: 'en' | 'pt-BR'): string {
  // Remove markdown headers, bullets, and common prefixes
  let cleaned = message
    .replace(/^#{1,6}\s*/g, '')
    .replace(/^[-*]\s*/g, '')
    .replace(/```/g, '')
    .replace(/^Here.*commit.*message.*$/gim, '')
    .replace(/^Example:?\s*/gi, '')
    .replace(/^\s*"|"\s*$/g, '')
    .trim();

  // Extract first line if multiline
  cleaned = cleaned.split('\n')[0].trim();

  // Ensure Conventional Commits format (type(scope): description or type: description)
  const conventionalCommitPattern = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([\w-]+\))?:\s*.+$/;
  
  if (!conventionalCommitPattern.test(cleaned)) {
    // Try to extract just the commit part from common patterns
    const match = cleaned.match(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([\w-]+\))?:\s*(.+)$/i);
    if (match) {
      cleaned = `${match[1]}${match[2] || ''}: ${match[3]}`;
    } else {
      // Fallback: wrap in docs: if it looks like a description
      cleaned = `docs(extension): ${cleaned.toLowerCase().replace(/^changelog\./, '').replace(/\.$/, '')}`;
    }
  }

  // Truncate to 72 chars max
  if (cleaned.length > 72) {
    cleaned = cleaned.substring(0, 72);
  }

  return cleaned;
}