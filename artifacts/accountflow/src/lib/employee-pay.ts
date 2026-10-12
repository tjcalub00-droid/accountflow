export interface Employee {
  id: string;
  fullName: string;
  role: string;
  monthlySalary: number;
  sssRate: number;
  pagibigRate: number;
  hdmfRate: number;
  isActive: boolean;
}

export interface EmployeePay {
  gross: number;
  sss: number;
  pagibig: number;
  hdmf: number;
  deductions: number;
  net: number;
}

function amount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapEmployeeRecord(row: Record<string, unknown>): Employee {
  return {
    id: String(row.id ?? ''),
    fullName: String(row.full_name ?? ''),
    role: String(row.role ?? ''),
    monthlySalary: amount(row.monthly_salary),
    sssRate: amount(row.sss_rate),
    pagibigRate: amount(row.pagibig_rate),
    hdmfRate: amount(row.hdmf_rate),
    isActive: Boolean(row.is_active),
  };
}

export function getMonthlyEmployeePay(employee: Employee): EmployeePay {
  const deductions = employee.sssRate + employee.pagibigRate + employee.hdmfRate;
  return {
    gross: employee.monthlySalary,
    sss: employee.sssRate,
    pagibig: employee.pagibigRate,
    hdmf: employee.hdmfRate,
    deductions,
    net: employee.monthlySalary - deductions,
  };
}

export function getBimonthlyEmployeePay(employee: Employee): EmployeePay {
  const monthly = getMonthlyEmployeePay(employee);
  const half = (value: number) => Math.round(value / 2);
  return {
    gross: half(monthly.gross),
    sss: half(monthly.sss),
    pagibig: half(monthly.pagibig),
    hdmf: half(monthly.hdmf),
    deductions: half(monthly.deductions),
    net: half(monthly.net),
  };
}
