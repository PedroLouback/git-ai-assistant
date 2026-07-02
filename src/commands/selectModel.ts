import * as vscode from 'vscode';
import { getConfig, openSettings } from '../config';

interface OpenRouterModel {
  id: string;
  name?: string;
  expiration_date?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

export async function selectModel(): Promise<void> {
  const config = getConfig();

  if (!config.apiKey || config.apiKey.trim() === '') {
    const action = await vscode.window.showErrorMessage(
      'GitFlare Assistant: OpenRouter API Key is required to fetch available models.',
      'Open Settings'
    );
    if (action === 'Open Settings') {
      openSettings();
    }
    return;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models?sort=most-popular', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const responseData: any = await response.json();

    if (!responseData || typeof responseData !== 'object' || !Array.isArray(responseData.data)) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    const validModels = responseData.data
      .filter((model: any) => model && model.id && !model.expiration_date)
      .map((model: any) => {
        const isFree = model.pricing && model.pricing.prompt === '0';
        const detailParts: string[] = [];

        if (model.context_length) {
          detailParts.push(`${model.context_length / 1000}k ctx`);
        }

        const promptCost = model.pricing?.prompt || '0';
        const completionCost = model.pricing?.completion || '0';

        if (isFree) {
          detailParts.push('FREE');
        } else {
          const promptCostNum = parseFloat(promptCost) * 1000000;
          const completionCostNum = parseFloat(completionCost) * 1000000;
          const priceStr = `${promptCostNum.toFixed(2)}/${completionCostNum.toFixed(2)} per 1M tokens`;
          detailParts.push(priceStr);
        }

        const pickItem = {
          label: model.name || model.id,
          description: model.id,
          detail: detailParts.filter(Boolean).join(' · '),
          modelId: model.id,
          modelName: model.name || model.id
        };
        return pickItem;
      }) as any[];

    if (validModels.length === 0) {
      throw new Error('No available models found');
    }

    const picked = await vscode.window.showQuickPick(
      validModels,
      {
        placeHolder: 'Search OpenRouter models... (Type to filter)',
        matchOnDescription: true,
        matchOnDetail: false,
        ignoreFocusOut: true
      }
    );

    if (!picked) {
      return;
    }

    await vscode.workspace.getConfiguration('gitFlareAssistant').update(
      'model',
      picked.modelId,
      vscode.ConfigurationTarget.Global
    );

    vscode.window.showInformationMessage(
      `Model updated to ${picked.modelName} (${picked.modelId})`
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to fetch OpenRouter models: ${errorMessage}`);
  }
}