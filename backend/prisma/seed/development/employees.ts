import { PaymentMethod, SalaryFrequency } from '../../../src/generated/prisma/client.js';
import type { DbClient } from '../../../src/shared/database/transaction.js';

/**
 * Demo employees. Fixed phone numbers make the seed idempotent — see
 * customers.ts for the same pattern. See business-blueprint section 4.1.
 */
const DEMO_EMPLOYEES: {
  name: string;
  phone: string;
  jobTitle: string;
  salaryFrequency: SalaryFrequency;
  salaryAmount: string;
  paymentMethod: PaymentMethod;
}[] = [
  {
    name: 'Demo Employee — Njoroge Kimani',
    phone: '0700000101',
    jobTitle: 'Block producer',
    salaryFrequency: SalaryFrequency.WEEKLY,
    salaryAmount: '3500.00',
    paymentMethod: PaymentMethod.CASH,
  },
  {
    name: 'Demo Employee — Achieng Odhiambo',
    phone: '0700000102',
    jobTitle: 'Curing worker',
    salaryFrequency: SalaryFrequency.WEEKLY,
    salaryAmount: '3200.00',
    paymentMethod: PaymentMethod.MPESA,
  },
  {
    name: 'Demo Employee — Cheruiyot Kiplagat',
    phone: '0700000103',
    jobTitle: 'Yard supervisor',
    salaryFrequency: SalaryFrequency.MONTHLY,
    salaryAmount: '35000.00',
    paymentMethod: PaymentMethod.BANK_TRANSFER,
  },
];

export interface SeedEmployeesResult {
  created: number;
  skipped: number;
}

export async function seedDemoEmployees(client: DbClient): Promise<SeedEmployeesResult> {
  let created = 0;
  let skipped = 0;

  for (const demo of DEMO_EMPLOYEES) {
    const existing = await client.employee.findFirst({ where: { phone: demo.phone } });

    if (existing) {
      skipped += 1;
      continue;
    }

    await client.employee.create({ data: demo });
    created += 1;
  }

  return { created, skipped };
}
