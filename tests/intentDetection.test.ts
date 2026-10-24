import { detectImageIntent } from "../src/services/imagePromptService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("--- Testing Image Generation Intent Detection (Multilingual: EN & FA) ---");

// Test Positive Cases (English)
const positiveCasesEnglish = [
  "Based on everything we've discussed so far, create an image.",
  "Based on our conversation, generate an image of the castle",
  "Generate an image.",
  "Create a picture for me.",
  "Draw this scene.",
  "Make an image of Batman and Superman.",
  "Turn this idea into an illustration.",
  "make an image of him",
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

for (const query of positiveCasesEnglish) {
  const result = detectImageIntent(query);
  assert(result.isImageRequest === true, `Expected English "${query}" to be detected as image request`);
  console.log(`✓ [PASS] EN Positive detected: "${query.slice(0, 50)}..."`);
}

// Test Positive Cases (Persian / Farsi)
const positiveCasesPersian = [
  "یک عکس بساز",
  "برام تصویر تولید کن",
  "این صحنه رو نقاشی کن",
  "از این ایده یک تصویر بساز",
  "میخوام این رو به تصویر تبدیل کنی",
  "لطفاً یک تصویر زیبا از غروب دریا بکش",
  "برای من یک عکس از این شخصیت بساز",
  "از این صحنه عکس بساز",
  "این ایده را به عکس تبدیل کن",
  "تصویری از یک گربه فضایی بساز",
  "تصویرش رو بکش",
];

for (const query of positiveCasesPersian) {
  const result = detectImageIntent(query);
  assert(result.isImageRequest === true, `Expected Persian "${query}" to be detected as image request`);
  console.log(`✓ [PASS] FA Positive detected: "${query}"`);
}

// Test Negative Cases (English)
const negativeCasesEnglish = [
  "What is an image generation model?",
  "How does Stable Diffusion generate images from noise?",
  "Explain the difference between SDXL and SD 1.5",
  "Can you write a python script to crop an image using PIL?",
  "Tell me a story about a cybernetic cat",
  "How do I install ComfyUI on Linux?",
  "What was the capital of France?",
  "Explain diffusion models in simple terms",
];

for (const query of negativeCasesEnglish) {
  const result = detectImageIntent(query);
  assert(result.isImageRequest === false, `Expected English "${query}" to NOT be detected as image request`);
  console.log(`✓ [PASS] EN Negative ignored: "${query.slice(0, 50)}..."`);
}

// Test Negative Cases (Persian / Farsi)
const negativeCasesPersian = [
  "تصویر چیست؟",
  "مدل انتشار چیست و چگونه کار میکند؟",
  "هوش مصنوعی چطور تصویر میسازه؟",
  "تفاوت بین SDXL و SD 1.5 چیست؟",
  "کد پایتون برای ذخیره تصویر بنویس",
  "چرا کیفیت عکس‌ها متفاوت است؟",
  "درباره تاریخچه عکاسی توضیح بده",
];

for (const query of negativeCasesPersian) {
  const result = detectImageIntent(query);
  assert(result.isImageRequest === false, `Expected Persian "${query}" to NOT be detected as image request`);
  console.log(`✓ [PASS] FA Negative ignored: "${query}"`);
}

console.log("All Multilingual Intent Detection tests passed successfully!\n");
