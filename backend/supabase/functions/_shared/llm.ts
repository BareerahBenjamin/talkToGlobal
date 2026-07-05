// LLM abstraction layer — supports openai, anthropic, or custom endpoint
// All config via environment variables, no hardcoded URLs or model names

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  content: string;
  usage?: { input: number; output: number };
}

export async function chatCompletion(
  messages: Message[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const provider = Deno.env.get("LLM_PROVIDER");
  const apiKey = Deno.env.get("LLM_API_KEY");
  const baseUrl = Deno.env.get("LLM_BASE_URL");
  const model = Deno.env.get("LLM_MODEL");

  if (!provider) throw new Error("LLM_PROVIDER is not set");
  if (!apiKey) throw new Error("LLM_API_KEY is not set");
  if (!baseUrl) throw new Error("LLM_BASE_URL is not set");
  if (!model) throw new Error("LLM_MODEL is not set");

  const { temperature = 0.8, maxTokens = 2048 } = options;

  const call = (): Promise<LLMResponse> => {
    switch (provider) {
      case "openai":
        return callOpenAI(messages, apiKey, baseUrl, model, temperature, maxTokens);
      case "anthropic":
        return callAnthropic(messages, apiKey, baseUrl, model, temperature, maxTokens);
      case "custom":
        return callCustom(messages, apiKey, baseUrl, model, temperature, maxTokens);
      default:
        throw new Error(`Unknown LLM_PROVIDER: ${provider}. Must be: openai, anthropic, custom`);
    }
  };

  // Retry transient failures (network blips, timeouts, 5xx/429 from the proxy).
  // The upstream provider (vectorengine) occasionally times out; without this a
  // single hiccup surfaces to the user as a hard failure.
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await call();
    } catch (err) {
      lastErr = err;
      const msg = String(err);
      // Don't retry config errors or auth failures — they won't fix themselves.
      const retriable =
        !/is not set|Unknown LLM_PROVIDER|401|403|invalid|无效/i.test(msg);
      if (!retriable || attempt === MAX_ATTEMPTS) break;
      // Backoff: 600ms, 1500ms
      await new Promise((r) => setTimeout(r, attempt * 600 + 300));
    }
  }
  throw lastErr;
}

// fetch with a hard timeout so a hung upstream request fails fast (and gets
// retried by chatCompletion) instead of blocking the whole edge function.
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(`LLM request timed out after ${timeoutMs}ms at ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function parseLLMResponse(
  res: Response,
  provider: string,
  url: string
): Promise<any> {
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(
      `${provider} API error (${res.status}) at ${url}: ${bodyText.slice(0, 300)}`
    );
  }
  try {
    return JSON.parse(bodyText);
  } catch {
    // A 200 response that isn't JSON almost always means LLM_BASE_URL points at
    // the wrong endpoint (a web page / proxy), not a chat-completions API.
    throw new Error(
      `${provider} returned non-JSON from ${url} (status ${res.status}). ` +
        `Check LLM_BASE_URL/LLM_MODEL. Body starts: ${bodyText.slice(0, 200)}`
    );
  }
}

async function callOpenAI(
  messages: Message[],
  apiKey: string,
  baseUrl: string,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const url = `${baseUrl}/chat/completions`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  const data = await parseLLMResponse(res, "OpenAI", url);
  return {
    content: data.choices[0].message.content,
    usage: data.usage
      ? { input: data.usage.prompt_tokens, output: data.usage.completion_tokens }
      : undefined,
  };
}

async function callAnthropic(
  messages: Message[],
  apiKey: string,
  baseUrl: string,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  // Anthropic requires system message separate from messages
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const url = `${baseUrl}/v1/messages`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMsg?.content,
      messages: chatMessages,
    }),
  });

  const data = await parseLLMResponse(res, "Anthropic", url);
  return {
    content: data.content[0].text,
    usage: data.usage
      ? { input: data.usage.input_tokens, output: data.usage.output_tokens }
      : undefined,
  };
}

async function callCustom(
  messages: Message[],
  apiKey: string,
  baseUrl: string,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const url = `${baseUrl}/chat/completions`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  const data = await parseLLMResponse(res, "Custom LLM", url);
  return {
    content: data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? "",
    usage: data.usage
      ? { input: data.usage.prompt_tokens ?? data.usage.input_tokens, output: data.usage.completion_tokens ?? data.usage.output_tokens }
      : undefined,
  };
}
