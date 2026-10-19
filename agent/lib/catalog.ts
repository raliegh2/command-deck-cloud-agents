import type { Project } from './types';
export const agents = [
  ['orchestrator', 'Operations Orchestrator', 'Prioritize work, coordinate specialists and resolve ownership.'],
  ['portfolio', 'Portfolio Steward', 'Reconcile project inventory, scope and lifecycle.'],
  ['reliability', 'Reliability Monitor', 'Measure availability, latency, freshness and recovery.'],
  ['incident', 'Incident Commander', 'Triage incidents and assemble evidence-backed response plans.'],
  ['security', 'Security Reviewer', 'Review security evidence and proposed fixes within authorized scope.'],
  ['dependencies', 'Dependency Steward', 'Triage dependency advisories and prepare upgrade plans.'],
  ['frontend', 'Frontend Maintainer', 'Prepare interface and accessibility fixes.'],
  ['backend', 'Backend Maintainer', 'Prepare service and API fixes.'],
  ['data', 'Data and Identity Steward', 'Review migrations, identity links and recovery plans.'],
  ['qa', 'Verification Engineer', 'Define and review meaningful tests and smoke checks.'],
  ['release', 'Release Reviewer', 'Assess immutable changes and release readiness without deploying.'],
  ['cost', 'Cost and Capacity Analyst', 'Track limits, resource use and budget constraints.'],
  ['knowledge', 'Knowledge Graph Curator', 'Connect evidence, decisions and project context.'],
  ['reporter', 'Notion and Obsidian Reporter', 'Prepare sanitized reports with stable source identifiers.'],
  ['connector', 'Command Deck Integration Steward', 'Review connector contracts, snapshot freshness and permissions.'],
] as const;

// Public metadata only. Never copy local roots, tokens, customer rows or raw chat exports here.
export const projects: Project[] = [
 { id:'lessonplantogo', name:'LessonPlanToGo', repository:'raliegh2/teachplan-studio', url:'https://lessonplantogo.church-care-hub.workers.dev', mode:'production', owner:'backend' },
 { id:'church-care-hub', name:'Church Care Hub', repository:'raliegh2/church-care-hub', url:'https://church-care-hub.church-care-hub.workers.dev', mode:'production', owner:'data' },
 { id:'raliegh-portfolio', name:'Raliegh Portfolio', repository:'raliegh2/raliegh-cybersecurity-portfolio', url:'https://raliegh2.github.io/raliegh-cybersecurity-portfolio/', mode:'production', owner:'frontend' },
 { id:'ddos-detector', name:'DDoS Detector', repository:'raliegh2/ddos-detect', mode:'local', owner:'security' },
 { id:'northstar', name:'Northstar Agent Studio', repository:'raliegh2/northstar-agent-studio', mode:'local', owner:'frontend' },
 { id:'malware-lab', name:'Webaudit', repository:'raliegh2/webaudit', mode:'local', owner:'security' },
 { id:'gpt-codex-bridge', name:'GPT Codex Bridge', repository:'raliegh2/raliegh-ai-control-center', mode:'local', owner:'connector' },
 { id:'m5-v15-research', name:'MT5 Research', mode:'research', owner:'qa' },
 { id:'home-lab-suite', name:'Home Lab Suite', mode:'local', owner:'qa' },
 { id:'command-deck', name:'Command Deck', mode:'local', owner:'connector' },
 { id:'personal-brain', name:'Personal Brain', mode:'local', owner:'knowledge' },
];
export const projectById = (id: string) => {
 const p=projects.find(p=>p.id===id); if(!p) throw new Error('Unknown project'); return p;
};
