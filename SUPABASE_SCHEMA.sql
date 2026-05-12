-- ===================================================================
-- CHRONOS PONTO - PostgreSQL Schema for Supabase
-- ===================================================================
-- Execute este script no SQL Editor do Supabase em:
-- https://supabase.com/dashboard/project/[your-project]/sql/new
-- ===================================================================

-- Create Organization table
CREATE TABLE IF NOT EXISTS "Organization" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE',
  "organizationId" uuid NOT NULL REFERENCES "Organization"(id),
  "employeeId" uuid,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Department table
CREATE TABLE IF NOT EXISTS "Department" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "organizationId" uuid NOT NULL REFERENCES "Organization"(id),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Schedule table
CREATE TABLE IF NOT EXISTS "Schedule" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  "expectedWork" INTEGER DEFAULT 480,
  "startTime" TEXT DEFAULT '08:00',
  "endTime" TEXT DEFAULT '17:00',
  "intervalStart" TEXT DEFAULT '12:00',
  "intervalEnd" TEXT DEFAULT '13:00',
  "workDays" TEXT DEFAULT '1,2,3,4,5',
  tolerance INTEGER DEFAULT 10,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Employee table
CREATE TABLE IF NOT EXISTS "Employee" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  "roleTitle" TEXT DEFAULT 'Colaborador',
  "admissionDate" TIMESTAMP,
  "organizationId" uuid NOT NULL REFERENCES "Organization"(id),
  "departmentId" uuid REFERENCES "Department"(id),
  "scheduleId" uuid REFERENCES "Schedule"(id),
  "managerId" uuid REFERENCES "Employee"(id),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update User table to add FK to Employee
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" 
  FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE SET NULL
  ON CONFLICT DO NOTHING;

-- Create AttendanceRecord table
CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" uuid NOT NULL REFERENCES "Employee"(id),
  date TIMESTAMP NOT NULL,
  "totalWork" INTEGER DEFAULT 0,
  "overtime50" INTEGER DEFAULT 0,
  "overtime100" INTEGER DEFAULT 0,
  "nightShift" INTEGER DEFAULT 0,
  delay INTEGER DEFAULT 0,
  status TEXT DEFAULT 'NORMAL',
  justification TEXT,
  "isApproved" BOOLEAN DEFAULT false,
  "approvedBy" uuid,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create TimeEntry table
CREATE TABLE IF NOT EXISTS "TimeEntry" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recordId" uuid NOT NULL REFERENCES "AttendanceRecord"(id) ON DELETE CASCADE,
  time TIMESTAMP NOT NULL,
  type TEXT DEFAULT 'IN',
  original TEXT,
  "isManual" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create TimeBankEntry table
CREATE TABLE IF NOT EXISTS "TimeBankEntry" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" uuid NOT NULL REFERENCES "Employee"(id),
  date TIMESTAMP NOT NULL,
  "creditMinutes" INTEGER DEFAULT 0,
  "debitMinutes" INTEGER DEFAULT 0,
  "balanceMinutes" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Absence table
CREATE TABLE IF NOT EXISTS "Absence" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" uuid NOT NULL REFERENCES "Employee"(id),
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  type TEXT NOT NULL,
  reason TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Holiday table
CREATE TABLE IF NOT EXISTS "Holiday" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  name TEXT NOT NULL,
  "isNational" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  "entityId" TEXT,
  changes JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Upload table
CREATE TABLE IF NOT EXISTS "Upload" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fileName" TEXT NOT NULL,
  "filePath" TEXT,
  "uploadedBy" uuid,
  "organizationId" uuid REFERENCES "Organization"(id),
  "processedAt" TIMESTAMP,
  "recordCount" INTEGER,
  status TEXT DEFAULT 'PENDING',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Employee_organizationId_idx" ON "Employee"("organizationId");
CREATE INDEX IF NOT EXISTS "Employee_registration_idx" ON "Employee"(registration);
CREATE INDEX IF NOT EXISTS "AttendanceRecord_employeeId_idx" ON "AttendanceRecord"("employeeId");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_date_idx" ON "AttendanceRecord"(date);
CREATE INDEX IF NOT EXISTS "TimeEntry_recordId_idx" ON "TimeEntry"("recordId");
