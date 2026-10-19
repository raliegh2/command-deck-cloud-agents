import { defineAgent } from "eve";

export default defineAgent({
  model: "openai/gpt-6-luna-fast",
  reasoning: "high",
  defaultTools: false,
  tool: false,
  limits: { maxInputTokensPerSession: 24000, maxOutputTokensPerSession: 4000, maxTokenCostUsdPerSession: 0.25, sessionTimeoutMs: 1800000 },
});
