import cron from 'node-cron';
import { runDueSubscriptionAutomation } from '../modules/fnb/services/subscription-automation-runner.p3.service';

let running = false;
const isTestEnvironment = process.env.NODE_ENV === 'test';
const task = isTestEnvironment ? null : cron.schedule('15 * * * *', async () => {
  if (running) return;
  running = true;
  try {
    await runDueSubscriptionAutomation();
  } catch (error) {
    console.error('[Scheduler] Subscription auto-renew error:', error);
  } finally {
    running = false;
  }
});

export const subscriptionAutomationScheduler = {
  start: () => task?.start(),
  stop: () => task?.stop(),
};
