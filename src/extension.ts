import * as vscode from 'vscode';
import { generateCommitMessage } from './commands/commitMessage';
import { generatePRDescription } from './commands/prDescription';
import { reviewChanges } from './commands/reviewChanges';
import { selectModel } from './commands/selectModel';
import { getConfig, openSettings } from './config';

export function activate(context: vscode.ExtensionContext): void {
	const disposable1 = vscode.commands.registerCommand('git-flare-assistant.generateCommitMessage', generateCommitMessage);
	const disposable2 = vscode.commands.registerCommand('git-flare-assistant.generatePRDescription', generatePRDescription);
	const disposable3 = vscode.commands.registerCommand('git-flare-assistant.reviewChanges', reviewChanges);
	const disposable4 = vscode.commands.registerCommand('git-flare-assistant.selectModel', selectModel);

	context.subscriptions.push(disposable1, disposable2, disposable3, disposable4);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = "$(sparkle) GitFlare";
	statusBarItem.tooltip = "GitFlare Assistant - Click to generate commit message";
	statusBarItem.command = 'git-flare-assistant.generateCommitMessage';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	const config = getConfig();
	if (!config.apiKey || config.apiKey.trim() === '') {
		vscode.window.showInformationMessage(
			'GitFlare Assistant: Please configure your OpenRouter API key to get started.',
			'Configure'
		).then((selection) => {
			if (selection === 'Configure') {
				openSettings();
			}
		});
	}
}

export function deactivate(): void {}