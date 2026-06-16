import * as vscode from 'vscode';

export interface ExtensionConfig {
	apiKey: string;
	model: string;
	baseBranch: string;
	language: 'en' | 'pt-BR';
	useGitHubCLI: boolean;
}

export function getConfig(): ExtensionConfig {
	const config = vscode.workspace.getConfiguration('gitAiAssistant');
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
	vscode.commands.executeCommand('workbench.action.openSettings', 'gitAiAssistant');
}