import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 appraisal contracts', () => {
  const controller = read('src/modules/fnb/controllers/workforce-appraisal.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/workforce.routes.ts');
  const capability = read('src/middlewares/capability.middleware.ts');
  const migration = read('prisma/migrations/20260813043000_p2_appraisals_core/migration.sql');
  const migrationRunner = read('src/scripts/apply-p1-migrations.ts');
  const dbVerifier = read('src/scripts/verify-p1-database-v2.ts');

  test('appraisal routes are capability-gated and self-service is separate', () => {
    expect(routes).toContain("requireCapability('workforce.appraisal.read')");
    expect(routes).toContain("requireCapability('workforce.appraisal.manage')");
    expect(routes).toContain("requireCapability('workforce.appraisal.self')");
    expect(routes).toContain("/appraisals/:id/self-submit");
    expect(routes).toContain("/appraisals/:id/finalize");
    expect(capability).toContain("'workforce.appraisal.self'");
  });

  test('appraisal lifecycle reuses existing employee source of truth', () => {
    expect(migration).toContain('REFERENCES accounting.employees(id)');
    expect(migration).toContain('ux_workforce_appraisal_cycle_employee');
    expect(controller).toContain("tx.employees.findFirst");
    expect(controller).toContain("employee_id = ${employee.id}");
    expect(dbVerifier).toContain('Appraisals must reference accounting.employees source of truth');
  });

  test('goals are complete, weighted to 100 and scored on a bounded scale', () => {
    expect(controller).toContain('APPRAISAL_WEIGHT_TOTAL_INVALID');
    expect(controller).toContain('Math.abs(totalWeight - 100) > 0.01');
    expect(controller).toContain('APPRAISAL_GOALS_INCOMPLETE');
    expect(controller).toContain('parsed < 0 || parsed > 5');
    expect(migration).toContain('workforce_appraisal_goal_weight_valid');
    expect(migration).toContain('workforce_appraisal_goal_reviewer_score_valid');
  });

  test('self and manager reviews are transactional, row locked and concurrency guarded', () => {
    expect(controller).toContain('prisma.$transaction(async (tx) =>');
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('APPRAISAL_CONCURRENT_UPDATE');
    expect(controller).toContain('APPRAISAL_REVIEWER_MISMATCH');
    expect(controller).toContain("status = 'manager_review'");
    expect(controller).toContain("status = 'completed'");
  });

  test('cycle cannot close with unfinished reviews', () => {
    expect(controller).toContain('APPRAISALS_INCOMPLETE');
    expect(controller).toContain("status NOT IN ('completed','cancelled')");
  });

  test('migration runner and database verifier include appraisal schema', () => {
    expect(migrationRunner).toContain('20260813043000_p2_appraisals_core');
    expect(dbVerifier).toContain('workforce_appraisal_cycles');
    expect(dbVerifier).toContain('workforce_appraisals');
    expect(dbVerifier).toContain('workforce_appraisal_goals');
    expect(dbVerifier).toContain('Expected 10 suite migration ledger entries');
  });
});
