import {defineTool} from 'eve/tools';
import {z} from 'zod';
import {projects,projectById} from '../../../lib/catalog';
import {store} from '../../../lib/store';
import {assertAiEnabled} from '../../../lib/policy';
export default defineTool({description:'Read allowlisted project metadata and current observed state; never infer health from missing observations.',inputSchema:z.object({projectId:z.string()}),async execute({projectId}){assertAiEnabled();const project=projectById(projectId);const state=await store().read();return {project,observation:state.observations[project.id]??null,tasks:state.tasks.filter(x=>x.projectId===project.id)};}});
