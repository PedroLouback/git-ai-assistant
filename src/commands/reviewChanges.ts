import * as vscode from 'vscode';
import { getConfig, validateConfig, openSettings } from '../config';
import { callOpenRouter, OpenRouterMessage } from '../openrouter';
import { getStagedDiff } from '../gitService';
import * as path from 'path';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## 🔴')) {
      result.push(`<h2 style="color: #ff6b6b;">${escapeHtml(line.substring(3).trim())}</h2>`);
    } else if (line.startsWith('## 🟡')) {
      result.push(`<h2 style="color: #ffd93d;">${escapeHtml(line.substring(3).trim())}</h2>`);
    } else if (line.startsWith('## 🟢')) {
      result.push(`<h2 style="color: #69db7c;">${escapeHtml(line.substring(3).trim())}</h2>`);
    } else if (line.startsWith('## 📝')) {
      result.push(`<h2 style="color: #74c0fc;">${escapeHtml(line.substring(3).trim())}</h2>`);
    } else if (line.startsWith('## ')) {
      result.push(`<h2>${escapeHtml(line.substring(2).trim())}</h2>`);
    } else {
      result.push(escapeHtml(line));
    }
  }

  return result.join('<br>');
}

function getReviewHtml(content: string): string {
  const formattedContent = formatMarkdown(content);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
    .review-content {
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .review-content h2 {
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .review-content h2:first-child {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="copy()">📋 Copy Review</button>
    <button onclick="saveFile()">💾 Save as File</button>
  </div>
  <div class="review-content">${formattedContent}</div>
  <script>
    const vscode = acquireVsCodeApi();
    function copy() {
      vscode.postMessage({ command: 'copy' });
    }
    function saveFile() {
      vscode.postMessage({ command: 'saveFile' });
    }
  </script>
</body>
</html>`;
}

export async function reviewChanges(): Promise<void> {
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

  const scope = await vscode.window.showQuickPick(
    [
      { label: '$(git-commit) Staged changes', value: 'staged', description: 'Review only staged changes' },
      { label: '$(diff) All changes', value: 'all', description: 'Review all modified files' }
    ],
    { placeHolder: 'What do you want to review?' }
  );

  if (!scope) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'GitFlare: Reviewing changes...',
      cancellable: false
    },
    async () => {
      try {
        let diff: string;
        try {
          diff = await getStagedDiff();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to get changes: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }

        if (!diff || diff.length < 10) {
          vscode.window.showWarningMessage('No changes found to review.');
          return;
        }

        diff = diff.substring(0, 12000);

        const systemMessage: OpenRouterMessage = {
          role: 'system',
          content: config.language === 'pt-BR'
            ? 'Você é um engenheiro de software sênior fazendo uma revisão de código completa. Analise o diff fornecido e dê feedback estruturado com estas seções:\n\n## 🔴 Problemas Críticos\nBugs, vulnerabilidades de segurança ou breaking changes que DEVEM ser corrigidos.\n\n## 🟡 Sugestões\nMelhorias de qualidade, performance ou boas práticas.\n\n## 🟢 Aspectos Positivos\nCoisas feitas bem.\n\n## 📝 Resumo\nAvaliação geral breve.\n\nSeja específico e referencie números de linha ou nomes de funções quando possível. Retorne APENAS a revisão.'
            : 'You are a senior software engineer doing a thorough code review. Analyze the provided diff and give structured feedback with these sections:\n\n## 🔴 Critical Issues\nBugs, security vulnerabilities, or breaking changes that MUST be fixed.\n\n## 🟡 Suggestions\nImprovements for code quality, performance, or best practices.\n\n## 🟢 Positive Aspects\nThings done well.\n\n## 📝 Summary\nBrief overall assessment.\n\nBe specific and reference line numbers or function names when possible. If there are no items in a category, write \'None found.\'. Return ONLY the review.'
        };

        const userMessage: OpenRouterMessage = {
          role: 'user',
          content: `Review this code diff:\n\n${diff}`
        };

        let review: string;
        try {
          review = await callOpenRouter({
            apiKey: config.apiKey,
            model: config.model,
            messages: [systemMessage, userMessage],
            temperature: 0.2,
            maxTokens: 2048
          });
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to generate review: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }

        const panel = vscode.window.createWebviewPanel(
          'codeReview',
          'Code Review',
          vscode.ViewColumn.Beside,
          { enableScripts: true }
        );

        panel.webview.html = getReviewHtml(review);

        panel.webview.onDidReceiveMessage(async (message) => {
          if (message.command === 'copy') {
            vscode.env.clipboard.writeText(review);
            vscode.window.showInformationMessage('Review copied to clipboard!');
          } else if (message.command === 'saveFile') {
            const timestamp = Date.now();
            const filename = `.ai-review-${timestamp}.md`;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              const filePath = path.join(workspaceFolders[0].uri.fsPath, filename);
              await vscode.workspace.fs.writeFile(
                vscode.Uri.file(filePath),
                Buffer.from(review, 'utf8')
              );
              vscode.window.showInformationMessage(`Review saved to ${filename}`);
            } else {
              vscode.window.showErrorMessage('No workspace folder found to save the review.');
            }
          }
        });
      } catch (err: any) {
        vscode.window.showErrorMessage(`Unexpected error: ${err.message}`);
      }
    }
  );
}
