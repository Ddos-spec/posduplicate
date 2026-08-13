import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 recruitment contracts', () => {
  const controller = read('src/modules/fnb/controllers/workforce-recruitment.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/workforce.routes.ts');
  const migration = read('prisma/migrations/20260813040000_p2_recruitment_core/migration.sql');

  test('recruitment routes are capability-gated', () => {
    expect(routes).toContain("requireCapability('workforce.recruitment.read')");
    expect(routes).toContain("requireCapability('workforce.recruitment.manage')");
    expect(routes).toContain("/recruitment/applicants/:id/interviews");
    expect(routes).toContain("/recruitment/applicants/:id/offers");
    expect(routes).toContain("/recruitment/applicants/:id/hire");
  });

  test('dedicated actions protect interview, offer and hire stages', () => {
    expect(controller).toContain("['interview', 'offer', 'hired'].includes(target)");
    expect(controller).toContain('DEDICATED_ACTION_REQUIRED');
    expect(controller).toContain('INVALID_INTERVIEW_STAGE');
    expect(controller).toContain('INVALID_OFFER_STAGE');
    expect(controller).toContain('ACCEPTED_OFFER_REQUIRED');
  });

  test('critical lifecycle mutations are row locked and transactional', () => {
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('FOR UPDATE OF o, a');
    expect(controller).toContain('FOR UPDATE OF a, v');
    expect(controller).toContain('prisma.$transaction(async (tx) =>');
    expect(controller).toContain('APPLICANT_CONCURRENT_UPDATE');
    expect(controller).toContain('INTERVIEW_CONCURRENT_UPDATE');
  });

  test('hiring converts into existing accounting employee source of truth', () => {
    expect(controller).toContain('tx.employees.create');
    expect(controller).toContain('EMPLOYEE_ID_EXISTS');
    expect(controller).toContain('EMPLOYEE_USER_ALREADY_LINKED');
    expect(controller).toContain("stage = 'hired'");
    expect(migration).toContain('REFERENCES accounting.employees(id)');
    expect(migration).toContain('ux_workforce_recruitment_hired_employee');
  });

  test('database prevents duplicate applicant email and multiple accepted offers', () => {
    expect(migration).toContain('ux_workforce_recruitment_applicant_email_vacancy');
    expect(migration).toContain('lower(email)');
    expect(migration).toContain('ux_workforce_recruitment_offer_accepted');
    expect(migration).toContain("WHERE status = 'accepted'");
  });
});
