import { api, type PaginationMeta } from '@/lib/api-client';
import type { Employee, EmployeeFilters } from '../types/employee.types';
import type { EmployeeFormValues } from '../schemas/employee.schema';

export interface EmployeeListResult {
  employees: Employee[];
  meta: PaginationMeta;
}

export async function fetchEmployees(filters: EmployeeFilters): Promise<EmployeeListResult> {
  const { data, meta } = await api.get<Employee[]>('/employees', {
    query: {
      page: filters.page,
      pageSize: filters.pageSize,
      search: filters.search,
      salaryFrequency: filters.salaryFrequency,
      isActive: filters.isActive === undefined ? undefined : String(filters.isActive),
    },
  });

  return { employees: data, meta: meta as unknown as PaginationMeta };
}

export async function fetchEmployee(id: string): Promise<Employee> {
  const { data } = await api.get<Employee>(`/employees/${id}`);
  return data;
}

export async function createEmployee(values: EmployeeFormValues): Promise<Employee> {
  const { data } = await api.post<Employee>('/employees', normalise(values));
  return data;
}

export async function updateEmployee(id: string, values: EmployeeFormValues): Promise<Employee> {
  const { data } = await api.patch<Employee>(`/employees/${id}`, normalise(values));
  return data;
}

export async function setEmployeeActive(id: string, isActive: boolean): Promise<Employee> {
  const { data } = await api.post<Employee>(`/employees/${id}/${isActive ? 'activate' : 'deactivate'}`, {});
  return data;
}

/** An empty optional field clears the value, so it is sent as null. */
function normalise(values: EmployeeFormValues) {
  return {
    name: values.name,
    phone: values.phone,
    nationalId: values.nationalId?.trim() ? values.nationalId.trim() : null,
    jobTitle: values.jobTitle,
    salaryFrequency: values.salaryFrequency,
    salaryAmount: values.salaryAmount,
    paymentMethod: values.paymentMethod,
  };
}
