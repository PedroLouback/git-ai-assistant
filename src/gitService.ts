import * as vscode from 'vscode';
import { execSync } from 'child_process';

const ALLOWED_GIT_COMMANDS = [
  'rev-parse --is-inside-work-tree',
  'diff --staged',
  'diff',
  'log',
  'rev-parse --abbrev-ref HEAD'
];

const ALLOWED_BASE_BRANCHES = ['main', 'master', 'develop'];

function isAllowedGitCommand(command: string): boolean {
  const baseCommand = command.trim().split(' ')[0];
  if (!['rev-parse', 'diff', 'log'].includes(baseCommand)) {
    return false;
  }
  return ALLOWED_GIT_COMMANDS.some(allowed => command.startsWith(allowed));
}

function hasPathTraversal(command: string): boolean {
  return command.includes('../') || command.includes('..\\') || command.includes('../../');
}

function git(command: string, cwd: string): string {
  if (!isAllowedGitCommand(command)) {
    throw new Error(`Git command not allowed: ${command.split(' ')[0]}`);
  }
  if (hasPathTraversal(command)) {
    throw new Error('Path traversal detected in git command');
  }
  try {
    return execSync(`git ${command}`, {
      cwd,
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (err: any) {
    const stderr = err.stderr?.toString?.() ?? '';
    const stdout = err.stdout?.toString?.() ?? '';
    throw new Error(stderr || stdout || err.message);
  }
}

export function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder open in VS Code.');
  }
  return folders[0].uri.fsPath;
}

export function ensureGitRepo(cwd?: string): void {
  const root = cwd ?? getWorkspaceRoot();
  try {
    git('rev-parse --is-inside-work-tree', root);
  } catch {
    throw new Error('Not a git repository. Please open a folder that is a Git repository.');
  }
}

export async function getStagedDiff(cwd?: string): Promise<string> {
  const root = cwd ?? getWorkspaceRoot();

  try {
    git('rev-parse --is-inside-work-tree', root);
  } catch {
    throw new Error(`No Git repository found at: ${root}`);
  }

  const staged = git('diff --staged', root);
  if (staged && staged.length > 0) { return staged; }

  const unstaged = git('diff', root);
  if (unstaged && unstaged.length > 0) { return unstaged; }

  throw new Error('No changes found. Stage your changes with git add first.');
}

export async function getCurrentBranch(cwd?: string): Promise<string> {
  const root = cwd ?? getWorkspaceRoot();
  try {
    return git('rev-parse --abbrev-ref HEAD', root);
  } catch {
    return 'unknown';
  }
}

export async function getCommitLog(baseBranch: string, cwd?: string): Promise<string> {
  if (!ALLOWED_BASE_BRANCHES.includes(baseBranch)) {
    throw new Error(`Base branch not allowed: ${baseBranch}`);
  }
  const root = cwd ?? getWorkspaceRoot();
  try {
    return git(`log ${baseBranch}..HEAD --oneline --no-merges`, root);
  } catch {
    return '';
  }
}

export async function getPRDiff(baseBranch: string, cwd?: string): Promise<string> {
  if (!ALLOWED_BASE_BRANCHES.includes(baseBranch)) {
    throw new Error(`Base branch not allowed: ${baseBranch}`);
  }
  const root = cwd ?? getWorkspaceRoot();
  try {
    const diff = git(`diff ${baseBranch}...HEAD`, root);
    if (diff && diff.length > 0) { return diff; }
  } catch { /* fallback */ }
  return getStagedDiff(root);
}