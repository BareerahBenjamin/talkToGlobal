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
}

async function callOpenAI(
  messages: Message[],
  apiKey: string,
  baseUrl: string,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<LLMResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
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

  const res = await fetch(`${baseUrl}/v1/messages`, {
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json();
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
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom LLM API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? "",
    usage: data.usage
      ? { input: data.usage.prompt_tokens ?? data.usage.input_tokens, output: data.usage.completion_tokens ?? data.usage.output_tokens }
      : undefined,
  };
}
