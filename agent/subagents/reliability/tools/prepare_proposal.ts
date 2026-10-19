import {defineTool} from 'eve/tools';
import {z} from 'zod';
import {store} from '../../../lib/store';
import {projectById} from '../../../lib/catalog';
import {assertAiEnabled,redact} from '../../../lib/policy';
import {report} from '../../../lib/operations';
export default defineTool({description:'Record a review-only change proposal or unified diff with evidence. Does not edit source, open a PR or deploy.',inputSchema:z.object({projectId:z.string(),title:z.string().min(3).max(150),proposal:z.string().min(20).max(12000),evidence:z.array(z.string().max(500)).min(1).max(12)}),async execute(input){assertAiEnabled();const p=projectById(input.projectId);return store().transact(state=>{const task={id:crypto.randomUUID(),projectId:p.id,owner:"reliability",kind:'proposal' as const,status:'needs_review' as const,title:redact(input.title),proposal:redact(input.proposal),evidence:input.evidence.map(redact),createdAt:new Date().toISOString()};state.tasks.push(task);report(state,'Proposal: '+task.title,'# Proposed change\n\n'+task.proposal+'\n\nEvidence:\n'+task.evidence.join('\n')+'\n\nHuman review required. No code was applied.',p.id);return {taskId:task.id,status:task.status};});}});
