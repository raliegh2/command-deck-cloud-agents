import { defineAgent } from 'eve';
export default defineAgent({description:"Reconcile project inventory, scope and lifecycle.",model:'openai/gpt-6-luna-fast',reasoning:'high',defaultTools:false,tool:'deferred',limits:{maxInputTokensPerSession:12000,maxOutputTokensPerSession:2000,maxTokenCostUsdPerSession:0.10,sessionTimeoutMs:900000}});
