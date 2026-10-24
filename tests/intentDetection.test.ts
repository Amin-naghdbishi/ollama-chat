import { detectImageIntent } from "../src/services/imagePromptService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("--- Testing Image Generation Intent Detection ---");

// Test Positive Cases
const positiveCases = [
  "Based on everything we've discussed so far, create an image.",
  "Based on our conversation, generate an image of the castle",
  "Create an image of a cybernetic cat in Tokyo at night",
  "Generate an image of a serene mountain lake at sunrise",
  "Draw an image of a futuristic spaceship",
  "Draw me a picture of an enchanted forest",
  "Paint me a portrait of an ancient warrior",
  "Please make an illustration of our hero",
  "Visualize this scene in neon cyberpunk style",
  "Can you render an image of the robot barista?",
  "A photo of a cozy coffee shop in autumn",
];

for (const query of positiveCases) {
  const result = detectImageIntent(query);
  assert(result.isImageRequest === true, `Expected "${query}" to be detected as image request`);
  console.log(`✓ [PASS] Positive detected: "${query.slice(0, 50)}..."`);
}

// Test Negative Cases (Regular Chat)
const negativeCases = [
  "What is an image generation model?",
  "How does Stable Diffusion generate images from noise?",
  "Explain the difference between SDXL and SD 1.5",
  "Can you write a python script to crop an image using PIL?",
  "Tell me a story about a cybernetic cat",
  "How do I install ComfyUI on Linux?",
  "What was the capital of France?",
  "Explain diffusion models in simple terms",
];

for (const query of negativeCases) {
  const result = detectImageIntent(query);
  assert(result.isImageRequest === false, `Expected "${query}" to NOT be detected as image request`);
  console.log(`✓ [PASS] Negative ignored: "${query.slice(0, 50)}..."`);
}

console.log("All Intent Detection tests passed successfully!\n");
