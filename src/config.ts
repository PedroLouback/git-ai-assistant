import * as vscode from 'vscode';

export interface ExtensionConfig {
	apiKey: string;
	model: string;
	baseBranch: string;
	language: 'en' | 'pt-BR';
	useGitHubCLI: boolean;
}

const DANGEROUS_PATTERNS = [
  /`[^`]*password[^`]*`/,           // Senhas de código
  /API Key[:=]\s*['"][^'\"]+['\"]/,
  /senha[:=]\s*['"][^'\"]+['\"]/,
  /token[:=]\s*['"][^'\"]+['\"]/,
  /Bearer\s+[A-Za-z0-9_-]{20,}/,
  /git.*config.*show.*url/,
  /\.env.*file.*show/,
  /secrets\.(github|gitlab|aws)/,
  /chave.*privada|privada=/,
  /secret[0-9]*=/,
];

export function getConfig(): ExtensionConfig {
	const config = vscode.workspace.getConfiguration('gitFlareAssistant');
	return {
		apiKey: config.get<string>('apiKey') ?? '',
		model: config.get<string>('model') ?? 'google/gemini-2.0-flash-exp:free',
		baseBranch: config.get<string>('baseBranch') ?? 'main',
		language: config.get<'en' | 'pt-BR'>('language') ?? 'en',
		useGitHubCLI: config.get<boolean>('useGitHubCLI') ?? true
	};
}

export function validateConfig(config: ExtensionConfig): string | null {
	if (!config.apiKey || config.apiKey.trim() === '') {
		return 'OpenRouter API Key is required. Please set it in the extension settings.';
	}
	return null;
}

export function openSettings(): void {
	vscode.commands.executeCommand('workbench.action.openSettings', 'gitFlareAssistant');
}

// Prevenção adicional contra padrões vulneráveis
export function validateApiKey(apiKey: string): boolean {
	if (typeof apiKey !== 'string' || apiKey.length === 0) {
		return false;
	}
	const patterns = [
		/password[:=]\s*['\"][^'\"]+['\"]/,
		/senha[:=]\s*['\"][^'\"]+['\"]/,
		/chave.*privada|privada=/,
		/.env.*show|\.gitignore.*show/,
		/git config.*url|git status.*branch/,
		/secret.*=.*[A-Za-z0-9_-]+/,
		/API Key.*=.*[A-Za-z0-9_-]+/,
		/.*password.*/, /.*secret.*/, /.*private.*/
	];
	for (const pattern of patterns) {
		if (pattern.test(apiKey)) {
			return false;
		}
	}
	return true;
}
export function isValidPRNumber(input: string): string | null {
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
