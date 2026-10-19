import {defineSandbox,type SandboxSession} from 'eve/sandbox';
import {defineSandboxProvider} from 'eve/sandbox/provider';
// Explicitly fail closed if a future tool tries to open an execution sandbox.
// Inspection and proposal preparation use bounded API tools, so no VM is needed.
const DisabledExecution=defineSandboxProvider<Record<string,never>,Record<string,never>,{disabled:true},Record<string,never>,SandboxSession>({
 name:'disabled-execution',
 environment(){return {
  async prepare(){return {disabled:true as const};},
  async start(){throw new Error('Execution sandboxes are disabled in review-only mode');},
  async resume(){throw new Error('Execution sandboxes are disabled in review-only mode');},
 };},
});
export const environment=DisabledExecution.environment();
export default defineSandbox(()=>environment.open());
