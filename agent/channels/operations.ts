import { defineChannel, GET, POST } from 'eve/channels';
import { handle } from '../lib/http';
export default defineChannel({routes:[
 GET('/ops/health',request=>handle(request)),
 GET('/ops/status',request=>handle(request)),
 GET('/ops/reports',request=>handle(request)),
 POST('/ops/monitor',request=>handle(request)),
 POST('/ops/deck-snapshot',request=>handle(request)),
 POST('/ops/proposals',request=>handle(request)),
]});
