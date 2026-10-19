import { defineSchedule } from 'eve/schedules';
import { store } from '../lib/store';
import { runCycle } from '../lib/operations';
import { deliverNotion } from '../lib/notion';
// Daily 09:17 America/Bogota, compatible with a daily-only Vercel plan.
// Optional GitHub scheduler invokes the authenticated monitor endpoint more frequently.
export default defineSchedule({cron:'17 14 * * *',async run(){const storage=store();await runCycle(storage);await deliverNotion(storage);}});
