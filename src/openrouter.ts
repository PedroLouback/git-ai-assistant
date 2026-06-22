import * as https from 'https';
import { validateApiKey } from './config';

const DANGEROUS_PATTERNS = [
  /`[^`]*password[^`]*`/,           // Senhas de código
  /API Key[:=]\s*['"][^'\"]+['\"]/,  // Chaves de API
  /senha[:=]\s*['"][^'\"]+['\"]/,     // Senhas em português
  /token[:=]\s*['"][^'\"]+['\"]/,     // Tokens
  /Bearer\s+[A-Za-z0-9_-]{20,}/,    // Tokens Bearer
  /git.*config.*show.*url/,          // Configuração git
  /\.env.*file.*show/,                // .env
  /secrets\.(github|gitlab|aws)/,   // Secrets
  /chave.*privi|privada/,           // Chaves privadas
  /secret[0-9]*=/,                  // Segredos genéricos
];

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

function validateApiKeyInput(apiKey: string): void {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key do OpenRouter é obrigatório');
  }
  if (apiKey.length < 32) {
    throw new Error('API key do OpenRouter deve ter pelo menos 32 caracteres');
  }
  if (apiKey.includes(' ') || apiKey.includes('\n') || apiKey.includes('\t')) {
    throw new Error('API key do OpenRouter contém caracteres inválidos');
  }
  if (!validateApiKey(apiKey)) {
    throw new Error('API key do OpenRouter contém padrão suspeito');
  }
}

function validateModel(model: string): void {
  if (!model || typeof model !== 'string') {
    throw new Error('Modelo do OpenRouter é obrigatório');
  }
  const validModels = [
    'google/gemini-2.0-flash-exp:free',
    'meta/llama-3.1-405b-instruct:free',
    'openai/gpt-4o-mini',
    'anthropic/claude-3-5-sonnet:free'
  ];
  if (!validModels.includes(model)) {
    throw new Error(`Modelo do OpenRouter não permitido: ${model}`);
  }
}

function validateMessages(messages: OpenRouterMessage[]): void {
  if (!Array.isArray(messages) || messages.length < 2) {
    throw new Error('Mensagem do sistema e usuário minimum de 2 mensagens');
  }
  if (messages.length > 3) {
    throw new Error('Máximo de 3 mensagens permitido');
  }
  
  const systemMessage = messages.find(m => m.role === 'system');
  if (!systemMessage) {
    throw new Error('Mensagem do sistema obrigatória');
  }
  if (systemMessage.content.length > 5000) {
    throw new Error('Prompt sistema muito grande');
  }
  
  for (const message of messages) {
    if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
      throw new Error(`Role de mensagem inválido: ${message.role}`);
    }
    if (!message.content || typeof message.content !== 'string') {
      throw new Error('Conteúdo de mensagem obrigatório');
    }
    if (message.content.length > 10000) {
      throw new Error('Conteúdo de mensagem muito grande');
    }
    
    const dangerousMatch = DANGEROUS_PATTERNS.find(pattern => 
      pattern.test(message.content.toLowerCase())
    );
    if (dangerousMatch) {
      throw new Error(`Mensagem contém padrão perigoso: ${dangerousMatch.toString()}`);
    }
  }
}

function extractContent(data: any): string {
  const choice = data?.choices?.[0];
  if (!choice) {
    throw new Error(`No choices in response. Full response: ${JSON.stringify(data)}`);
  }

  const msg = choice.message ?? choice.delta ?? {};

  const candidates = [
    msg.content,
    msg.reasoning,
    msg.reasoning_content,
    choice.text,
    choice.reasoning_text
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
      const content = candidate.trim();
      if (content.length > 5000) {
        throw new Error('Resposta muito grande do modelo');
      }
      return content;
    }
  }

  throw new Error(
    `Model returned empty content. finish_reason: "${choice.finish_reason}". ` +
    `Try a different model in Git AI Assistant settings.`
  );
}

export async function callOpenRouter(options: OpenRouterOptions): Promise<string> {
  const { apiKey, model, messages, maxTokens = 1024, temperature = 0.3 } = options;
  
  validateApiKeyInput(apiKey);
  validateModel(model);
  validateMessages(messages);

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'HTTP-Referer': 'https://github.com/git-flare-assistant',
        'X-Title': 'GitFlare Assistant',
        'User-Agent': 'GitFlare-Assistant/1.0'
      }
    }, (res) => {
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
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('OpenRouter request timed out after 30s.'));
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}