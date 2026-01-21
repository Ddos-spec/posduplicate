-- Create View for Trial Balance
CREATE OR REPLACE VIEW "accounting"."v_trial_balance" AS
SELECT
    gl.tenant_id,
    gl.account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    SUM(gl.debit_amount) AS total_debit,
    SUM(gl.credit_amount) AS total_credit,
    SUM(gl.debit_amount - gl.credit_amount) AS net_balance
FROM "accounting"."general_ledger" gl
JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
GROUP BY gl.tenant_id, gl.account_id, coa.account_code, coa.account_name, coa.account_type;
