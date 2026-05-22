/**
 * Cliente Ollama — corre desde el browser hacia http://127.0.0.1:11434.
 *
 * Por qué browser y no server:
 *   El server está en Vercel. Vercel no puede llamar a localhost de Jaime.
 *   El browser de Jaime corriendo en su Mac SÍ puede llamar localhost.
 *
 * Requisitos del lado de Jaime:
 *   1. ollama instalado y corriendo (`ollama serve` automático en Mac)
 *   2. modelo descargado (`ollama pull llama3.1:8b-instruct-q4_K_M`)
 *   3. CORS abierto para nuestra URL:
 *      launchctl setenv OLLAMA_ORIGINS "https://jayportu-manager-os.vercel.app,http://localhost:3010"
 *      (luego reiniciar Ollama)
 */

export const OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_MODEL = "llama3.1:8b-instruct-q4_K_M";
export const FALLBACK_MODEL = "llama3.2:3b";

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export interface OllamaStatus {
  available: boolean;
  version?: string;
  models?: OllamaModel[];
  defaultModelInstalled?: boolean;
  error?: string;
}

/** Pinguea Ollama. Si responde, lista los modelos. */
export async function checkOllamaStatus(
  signal?: AbortSignal
): Promise<OllamaStatus> {
  try {
    const versionRes = await fetch(`${OLLAMA_URL}/api/version`, {
      signal,
      method: "GET",
    });
    if (!versionRes.ok) {
      return { available: false, error: `Ollama respondió ${versionRes.status}` };
    }
    const versionJson = (await versionRes.json()) as { version?: string };

    const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`, { signal });
    if (!tagsRes.ok) {
      return {
        available: true,
        version: versionJson.version,
        error: "No se pudieron listar modelos",
      };
    }
    const tagsJson = (await tagsRes.json()) as { models?: OllamaModel[] };
    const models = tagsJson.models || [];
    const defaultModelInstalled = models.some(
      (m) => m.name === DEFAULT_MODEL || m.name === FALLBACK_MODEL
    );

    return {
      available: true,
      version: versionJson.version,
      models,
      defaultModelInstalled,
    };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Sin conexión a Ollama (¿está corriendo? ¿CORS configurado?)";
    return { available: false, error: msg };
  }
}

export interface GenerateOptions {
  model?: string;
  prompt: string;
  system?: string;
  /** Si true, devuelve un AsyncIterable para streaming */
  stream?: false;
  temperature?: number;
  signal?: AbortSignal;
}

export interface GenerateResult {
  output: string;
  model: string;
  durationMs: number;
}

/**
 * Llama a Ollama /api/generate con stream=false y devuelve la respuesta completa.
 * Usa modelo por default si no se especifica.
 */
export async function generateText(
  opts: GenerateOptions
): Promise<GenerateResult> {
  const model = opts.model || DEFAULT_MODEL;
  const started = Date.now();

  const body = {
    model,
    prompt: opts.prompt,
    system: opts.system,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.6,
    },
  };

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    // Si modelo no descargado, Ollama devuelve 404
    if (res.status === 404) {
      throw new Error(
        `Modelo "${model}" no está descargado. Corre: ollama pull ${model}`
      );
    }
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as { response?: string };
  return {
    output: (json.response || "").trim(),
    model,
    durationMs: Date.now() - started,
  };
}

/**
 * Streaming version (yields tokens as they arrive).
 * Útil cuando la respuesta puede ser larga y queremos mostrarla en vivo.
 */
export async function* generateTextStream(opts: GenerateOptions): AsyncGenerator<
  string,
  void,
  unknown
> {
  const model = opts.model || DEFAULT_MODEL;
  const body = {
    model,
    prompt: opts.prompt,
    system: opts.system,
    stream: true,
    options: { temperature: opts.temperature ?? 0.6 },
  };

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}`);
  }
  if (!res.body) throw new Error("Sin body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nlIdx;
    while ((nlIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nlIdx).trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line) as { response?: string; done?: boolean };
        if (obj.response) yield obj.response;
        if (obj.done) return;
      } catch {
        // Línea incompleta, ignorar
      }
    }
  }
}
