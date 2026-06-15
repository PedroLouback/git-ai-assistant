import * as https from 'https';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterOptions {
  apiKey: string;
  model: string;
  messages: OpenRouterMessage[];
  maxTokens?: number;
  temperature?: number;
}

function extractContent(data: any): string {
  const choice = data?.choices?.[0];
  if (!choice) {
    throw new Error(`No choices in response. Full response: ${JSON.stringify(data)}`);
  }

  const msg = choice.message ?? choice.delta ?? {};

  // Campos onde diferentes modelos colocam a resposta
  const candidates = [
    msg.content,
    msg.reasoning,
    msg.reasoning_content,
    choice.text
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  throw new Error(
    `Model returned empty content. finish_reason: "${choice.finish_reason}". ` +
    `Try a different model in Git AI Assistant settings.`
  );
}

export async function callOpenRouter(options: OpenRouterOptions): Promise<string> {
  const { apiKey, model, messages, maxTokens = 1024, temperature = 0.3 } = options;

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'HTTP-Referer': 'https://github.com/git-ai-assistant',
          'X-Title': 'Git AI Assistant'
        }
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`OpenRouter API error ${res.statusCode}: ${rawData}`));
            return;
          }

          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            reject(new Error(`Failed to parse OpenRouter response: ${rawData.slice(0, 200)}`));
            return;
          }

          try {
            resolve(extractContent(parsed));
          } catch (err: any) {
            reject(err);
          }
        });
      }
    );

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('OpenRouter request timed out after 30s.'));
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}