import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig, validateConfig, openSettings, ExtensionConfig, isValidPRNumber } from '../config';
import { callOpenRouter, OpenRouterMessage } from '../openrouter';
import { getStagedDiff, getCurrentBranch } from '../gitService';
import { execSync } from 'child_process';

function getGitAPI(): any {
  return vscode.extensions.getExtension('vscode.git')?.exports?.getAPI(1);
}

async function pickRepository(gitAPI: any): Promise<string | undefined> {
  const repos: any[] = gitAPI?.repositories ?? [];

  if (repos.length === 0) {
    throw new Error('No Git repositories found in workspace.');
  }

  if (repos.length === 1) {
    return repos[0].rootUri.fsPath;
  }

  const items = repos.map((r: any) => ({
    label: `$(repo) ${path.basename(r.rootUri.fsPath)}`,
    description: r.rootUri.fsPath,
    repoPath: r.rootUri.fsPath,
    detail: `Branch: ${r.state?.HEAD?.name ?? 'unknown'}`
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select repository for PR description',
    matchOnDescription: true
  });

  return picked?.repoPath;
}

export interface PRInfo {
  title: string;
  body: string | null;
  baseRefName: string;
  headRefName: string;
  author: string;
  additions: number;
  deletions: number;
  files: string[];
}

export async function generatePRDescription(): Promise<void> {
  const config = getConfig();
  const validationError = validateConfig(config);

  if (validationError) {
    vscode.window.showErrorMessage(validationError, 'Open Settings').then((selection) => {
      if (selection === 'Open Settings') {
        openSettings();
      }
    });
    return;
  }

  const gitAPI = getGitAPI();
  let repoPath: string | undefined;

  try {
    repoPath = await pickRepository(gitAPI);
  } catch (err: any) {
    vscode.window.showErrorMessage(err.message);
    return;
  }

  if (!repoPath) {
    return;
  }

  const prInput = await vscode.window.showInputBox({
    title: 'GitFlare: Generate PR Description',
    placeHolder: 'Enter PR number (e.g., 123) or PR URL',
    prompt: 'The extension will fetch PR details and diff using GitHub CLI'
  });

  if (!prInput) {
    return;
  }

  const prNumber = isValidPRNumber(prInput);
  if (!prNumber) {
    vscode.window.showErrorMessage('Invalid PR number or URL. Please enter a PR number (e.g., 123) or full GitHub PR URL.');
    return;
  }

  if (!config.useGitHubCLI) {
    await generatePRDescriptionLocal(prNumber, config, repoPath);
    return;
  }

  if (!isGitHubCLIAvailable()) {
    const install = await vscode.window.showErrorMessage(
      'GitHub CLI (gh) not found. Install it or disable "gitFlareAssistant.useGitHubCLI" in settings.',
      'Disable Setting',
      'Learn More'
    );
    if (install === 'Disable Setting') {
      await vscode.workspace.getConfiguration('gitFlareAssistant').update('useGitHubCLI', false, vscode.ConfigurationTarget.Global);
    } else if (install === 'Learn More') {
      vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com'));
    }
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `GitFlare: Fetching PR #${prNumber}...`,
      cancellable: false
    },
    async () => {
      let prInfo: PRInfo;
      try {
        prInfo = await fetchPRInfo(prNumber, repoPath!);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch PR: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }

      let diff: string;
      try {
        diff = await fetchPRDiff(prNumber, repoPath!);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch PR diff: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }

      if (!diff || diff.length < 10) {
        vscode.window.showWarningMessage(`PR #${prNumber} appears to have no changes.`);
        return;
      }

      diff = diff.substring(0, 10000);

      const context = `
PR Number: #${prNumber}
Title: ${prInfo.title}
Author: ${prInfo.author}
Base Branch: ${prInfo.baseRefName}
Head Branch: ${prInfo.headRefName}
Stats: +${prInfo.additions} -${prInfo.deletions}

Files changed:
${prInfo.files.slice(0, 20).join('\n')}
${prInfo.files.length > 20 ? `\n... and ${prInfo.files.length - 20} more files` : ''}

Previous description:
${prInfo.body ?? 'No description provided'}

Diff:
${diff}
`;

      const systemMessage: OpenRouterMessage = {
        role: 'system',
        content: config.language === 'pt-BR'
          ? 'Você é um desenvolvedor experiente. Gere uma descrição de Pull Request estruturada com: 1) Um título claro e conciso na primeira linha (sem markdown heading), 2) Uma linha em branco, 3) Seção ## Resumo explicando o propósito das mudanças, 4) Seção ## Alterações com bullet points das principais mudanças, 5) Seção ## Como Testar explicando como validar as alterações. Seja profissional e claro. Retorne APENAS a descrição do PR.'
          : 'You are an expert developer. Generate a structured Pull Request description with: 1) A clear and concise title on the first line (no markdown heading), 2) A blank line, 3) ## Summary section explaining the purpose of changes, 4) ## Changes section with bullet points of key changes, 5) ## Testing section explaining how to validate the changes. Be professional and clear. Return ONLY the PR description.'
      };

      const userMessage: OpenRouterMessage = {
        role: 'user',
        content: `Generate a PR description for these changes:\n\n${context}`
      };

      let prDescription: string;
      try {
        prDescription = await callOpenRouter({
          apiKey: config.apiKey,
          model: config.model,
          messages: [systemMessage, userMessage],
          temperature: 0.4,
          maxTokens: 1024
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate PR description: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        'prDescription',
        `PR #${prNumber} Description`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewHtml(prNumber, prDescription);
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'copy') {
          vscode.env.clipboard.writeText(prDescription);
          vscode.window.showInformationMessage('PR description copied to clipboard!');
        } else if (message.command === 'openEditor') {
          const doc = await vscode.workspace.openTextDocument({
            content: prDescription,
            language: 'markdown'
          });
          await vscode.window.showTextDocument(doc);
        }
      });
    }
  );
}

function isGitHubCLIAvailable(): boolean {
  try {
    const version = execSync('gh --version', { stdio: ['pipe', 'pipe', 'pipe'] });
    if (!version) return false;
    const versionStr = Buffer.isBuffer(version) ? version.toString('utf8') : version;
    if (typeof versionStr !== 'string') return false;
    const lowerStr = versionStr.toLowerCase();
    return lowerStr.includes('github cli') || lowerStr.includes('gh version');
  } catch {
    return false;
  }
}

function getPRNumber(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  
  const githubURLOptions = input.match(/github\.com\/([a-zA-Z0-9_.-]+\/\S+)\/pull\/(\d+)/);
  if (githubURLOptions) {
    const prNumber = githubURLOptions[2];
    if (/^\d{1,8}$/.test(prNumber)) {
      return prNumber;
    }
  }
  
  if (/^\d{1,8}$/.test(input.trim())) {
    return input.trim();
  }
  
  return null;
}

async function fetchPRInfo(prNumber: string, cwd: string): Promise<PRInfo> {
  const command = `gh pr view ${prNumber} --json title,body,baseRefName,headRefName,author,additions,deletions,files`;
  
  if (!isGitHubCLICommandAllowed(command)) {
    throw new Error(`GitHub CLI command not allowed: ${command}`);
  }
  
  try {
    const prJson = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    }).trim();

    const prData = JSON.parse(prJson);

    const filesList = prData.files?.map((f: { path: string }) => f.path).join('\n') ?? '';

    return {
      title: prData.title ?? '',
      body: prData.body,
      baseRefName: prData.baseRefName ?? '',
      headRefName: prData.headRefName ?? '',
      author: prData.author?.login ?? '',
      additions: prData.additions ?? 0,
      deletions: prData.deletions ?? 0,
      files: filesList.split('\n').filter((f: string) => f.length > 0)
    };
  } catch (err: any) {
    const stderr = err.stderr?.toString?.() ?? '';
    throw new Error(`Failed to fetch PR #${prNumber}: ${stderr || err.message}`);
  }
}

async function fetchPRDiff(prNumber: string, cwd: string): Promise<string> {
  const command = `gh pr diff ${prNumber}`;
  
  if (!isGitHubCLICommandAllowed(command)) {
    throw new Error(`GitHub CLI command not allowed: ${command}`);
  }
  
  try {
    const diff = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000
    }).trim();
    return diff;
  } catch (err: any) {
    const stderr = err.stderr?.toString?.() ?? '';
    throw new Error(`Failed to fetch PR diff: ${stderr || err.message}`);
  }
}

function isGitHubCLICommandAllowed(command: string): boolean {
  const gitHubCLIPatterns = [
    /^gh --version$/,
    /^gh pr view \d+ --json title,body,baseRefName,headRefName,author,additions,deletions,files$/,
    /^gh pr diff \d+$/,
  ];
  return gitHubCLIPatterns.some(pattern => pattern.test(command.trim()));
}

async function generatePRDescriptionLocal(prNumber: string, config: ExtensionConfig, repoPath: string): Promise<void> {
  let diff: string;
  try {
    diff = await getStagedDiff(repoPath);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to get changes: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (!diff || diff.length < 10) {
    vscode.window.showWarningMessage('No changes found to generate PR description.');
    return;
  }

  diff = diff.substring(0, 10000);

  let currentBranch: string;
  try {
    currentBranch = await getCurrentBranch(repoPath);
  } catch {
    currentBranch = 'unknown';
  }

  const context = `
Branch: ${currentBranch}
Base: ${config.baseBranch}

Changes diff:
${diff}
`;

  const systemMessage: OpenRouterMessage = {
    role: 'system',
    content: config.language === 'pt-BR'
      ? 'Você é um desenvolvedor experiente. Gere uma descrição de Pull Request com: 1) Um título claro na primeira linha (sem heading markdown), 2) Uma linha em branco, 3) Seção ## Resumo com o que foi alterado e por quê, 4) Seção ## Alterações com bullet points das principais mudanças, 5) Seção ## Testes descrevendo como testar. Seja conciso e profissional. Retorne APENAS a descrição do PR.'
      : 'You are an expert developer. Generate a Pull Request description with: 1) A clear title on the first line (no markdown heading), 2) A blank line, 3) ## Summary section with what was changed and why, 4) ## Changes section with bullet points of main changes, 5) ## Testing section describing how to test. Be concise and professional. Return ONLY the PR description.'
  };

  const userMessage: OpenRouterMessage = {
    role: 'user',
    content: `Generate a PR description for these changes:\n\n${context}`
  };

  let prDescription: string;
  try {
    prDescription = await callOpenRouter({
      apiKey: config.apiKey,
      model: config.model,
      messages: [systemMessage, userMessage],
      temperature: 0.4,
      maxTokens: 1024
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to generate PR description: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'prDescription',
    'PR Description',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewHtml(prNumber, prDescription);
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'copy') {
      vscode.env.clipboard.writeText(prDescription);
      vscode.window.showInformationMessage('PR description copied to clipboard!');
    } else if (message.command === 'openEditor') {
      const doc = await vscode.workspace.openTextDocument({
        content: prDescription,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
    }
  });
}

function getWebviewHtml(prNumber: string, content: string): string {
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      padding: 20px;
    }
    .toolbar {
      margin-bottom: 20px;
    }
    .toolbar button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      margin-right: 10px;
      cursor: pointer;
    }
    .content {
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="copy()">📋 Copy All</button>
    <button onclick="openEditor()">✏️ Open in Editor</button>
  </div>
  <div class="content">${escapedContent}</div>
  <script>
    const vscode = acquireVsCodeApi();
    function copy() {
      vscode.postMessage({ command: 'copy' });
    }
    function openEditor() {
      vscode.postMessage({ command: 'openEditor' });
    }
  </script>
</body>
</html>`;
}
