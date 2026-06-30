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

const commitMessage = await vscode.window.withProgress<string | undefined>(
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
              { role: 'user', content: `Analyze these code changes and generate a commit message:\n\n${truncatedDiff}` }
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

        setCommitMessage(gitAPI, repoPath!, commitMessage);
        return commitMessage;
      } catch (err: any) {
        vscode.window.showErrorMessage(`Unexpected error: ${err.message}`);
      }
    }
  );

  if (commitMessage) {
    const action = await vscode.window.showInformationMessage(
      `✅ Commit message generated for ${repoName}!`,
      'Copy'
    );
    if (action === 'Copy') {
      await vscode.env.clipboard.writeText(commitMessage);
    }
  }
}

function validateCommitMessage(message: string, language: 'en' | 'pt-BR'): string {
  let cleaned = message
    .replace(/^#{1,6}\s*/g, '')
    .replace(/^[-*]\s*/g, '')
    .replace(/```/g, '')
    .replace(/^(here|aqui está|segue|sugestão|sugestao|suggestion)[^:]*:?\s*/gim, '')
    .replace(/^(your\s+)?commit message:?\s*/gim, '')
    .replace(/^(mensagem de commit|mensagem):?\s*/gim, '')
    .replace(/^example:?\s*/gi, '')
    .replace(/^\s*"|"\s*$/g, '')
    .trim();

  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([\w-]+\))?:\s*.+$/i;

  const matchLine = lines.find(l => conventionalPattern.test(l));
  if (matchLine) {
    cleaned = matchLine;
  } else {
    cleaned = lines[0] || cleaned;
  }

  const conventionalCommitPattern = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([\w-]+\))?:\s*.+$/;
  
  if (!conventionalCommitPattern.test(cleaned)) {
    const match = cleaned.match(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([\w-]+\))?:\s*(.+)$/i);
    if (match) {
      cleaned = `${match[1]}${match[2] || ''}: ${match[3]}`;
    } else {
      cleaned = `docs(extension): ${cleaned.toLowerCase().replace(/^changelog\./, '').replace(/\.$/, '')}`;
    }
  }

  if (cleaned.length > 72) {
    cleaned = cleaned.substring(0, 72);
  }

  return cleaned;
}