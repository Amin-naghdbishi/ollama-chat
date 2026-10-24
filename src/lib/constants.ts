import { OllamaModel } from "../types";

export const FALLBACK_DEMO_MODELS: OllamaModel[] = [
  {
    name: "deepseek-r1:14b",
    model: "deepseek-r1:14b",
    modified_at: new Date().toISOString(),
    size: 9000000000,
    digest: "sha256:deepseek14b",
    details: {
      parent_model: "",
      format: "gguf",
      family: "deepseek-r1",
      families: ["deepseek-r1", "qwen2"],
      parameter_size: "14B",
      quantization_level: "Q4_K_M",
    },
  },
  {
    name: "llama3.2:3b",
    model: "llama3.2:3b",
    modified_at: new Date().toISOString(),
    size: 2000000000,
    digest: "sha256:llama32",
    details: {
      parent_model: "",
      format: "gguf",
      family: "llama",
      families: ["llama"],
      parameter_size: "3B",
      quantization_level: "Q4_K_M",
    },
  },
  {
    name: "qwen2.5-coder:7b",
    model: "qwen2.5-coder:7b",
    modified_at: new Date().toISOString(),
    size: 4700000000,
    digest: "sha256:qwen25coder",
    details: {
      parent_model: "",
      format: "gguf",
      family: "qwen2.5",
      families: ["qwen2.5"],
      parameter_size: "7B",
      quantization_level: "Q4_K_M",
    },
  },
  {
    name: "mistral:7b",
    model: "mistral:7b",
    modified_at: new Date().toISOString(),
    size: 4100000000,
    digest: "sha256:mistral7b",
    details: {
      parent_model: "",
      format: "gguf",
      family: "mistral",
      families: ["mistral"],
      parameter_size: "7B",
      quantization_level: "Q4_0",
    },
  },
  {
    name: "llava:7b",
    model: "llava:7b",
    modified_at: new Date().toISOString(),
    size: 4500000000,
    digest: "sha256:llava7b",
    details: {
      parent_model: "",
      format: "gguf",
      family: "llava",
      families: ["llava", "vision"],
      parameter_size: "7B",
      quantization_level: "Q4_0",
    },
  },
];

export async function simulateOfflineResponse({
  prompt,
  model,
  enableThinking,
  signal,
  onChunk,
}: {
  prompt: string;
  model: string;
  enableThinking: boolean;
  signal?: AbortSignal;
  onChunk: (chunkText: string, thinkingText?: string) => void;
}): Promise<void> {
  const isReasoningModel = model.toLowerCase().includes("r1") || enableThinking;

  // Step 1: Simulate thinking process if enabled
  if (isReasoningModel) {
    const thinkingSteps = [
      `Analyzing prompt: "${prompt}"...\n`,
      `Understanding context and code requirements.\n`,
      `Formulating step-by-step logic and structural solution...\n`,
      `Verifying edge cases and syntax optimization.\n`,
    ];

    for (const step of thinkingSteps) {
      if (signal?.aborted) return;
      onChunk("", step);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Step 2: Formulate response content based on query
  let responseText = "";

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("hook") || lowerPrompt.includes("react") || lowerPrompt.includes("debounce")) {
    responseText = `Here is a custom React hook for debouncing values in TypeScript:

\`\`\`typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
\`\`\`

### How to use:
\`\`\`tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 500);

useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
\`\`\`
`;
  } else if (lowerPrompt.includes("quantum") || lowerPrompt.includes("computing")) {
    responseText = `### Fundamental Principles of Quantum Computing

Quantum computing leverages quantum mechanics to perform complex computations exponentially faster than classical computers for specific problems.

1. **Superposition**: Unlike classical bits (0 or 1), a qubit can exist in a linear combination of both states simultaneously:
   $$\\psi = \\alpha|0\\rangle + \\beta|1\\rangle$$

2. **Entanglement**: Qubits can become linked such that the state of one instantly informs the state of another, regardless of distance.

3. **Quantum Interference**: Quantum algorithms manipulate probabilities to cancel out incorrect pathways and amplify correct answers.
`;
  } else {
    responseText = `I have received your message regarding **"${prompt}"** using model \`${model}\`.

### Solution Overview

Here is a structured approach:

1. **Architecture & Setup**: Ensure clean separation of concerns and clear modular boundaries.
2. **Implementation**:
\`\`\`javascript
// Sample implementation snippet
async function processTask(input) {
  console.log("Processing task with parameters:", input);
  return { status: "success", timestamp: Date.now() };
}
\`\`\`

> **Note on Local Connection:** If you want to route requests to your local hardware daemon, make sure \`ollama serve\` is running at your configured endpoint.
`;
  }

  // Stream text in chunks
  const words = responseText.split(" ");
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    const chunk = (i === 0 ? "" : " ") + words[i];
    onChunk(chunk, undefined);
    await new Promise((r) => setTimeout(r, 25));
  }
}
