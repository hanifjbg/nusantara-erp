import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { AuditService } from '../common/audit';
import { DB, type Db } from '../db.provider';
import {
  branches,
  costCenters,
  departments,
  jobGrades,
  jobPositions,
  organizations,
  reportingLines,
} from '../db/schema';

const orgSchema = z.object({
  orgCode: z.string().min(2).max(32),
  legalName: z.string().min(2),
  brandName: z.string().max(128).optional(),
  npwp: z.string().max(32).optional(),
  nib: z.string().max(32).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(32).optional(),
  industry: z.string().max(64).optional(),
});

const branchSchema = z.object({
  organizationId: z.string().uuid(),
  branchCode: z.string().min(2).max(32),
  branchName: z.string().min(2),
  isHeadOffice: z.boolean().default(false),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
});

const deptSchema = z.object({
  organizationId: z.string().uuid(),
  departmentCode: z.string().min(2).max(32),
  departmentName: z.string().min(2),
  parentDepartmentId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

const costCenterSchema = z.object({
  organizationId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  costCenterCode: z.string().min(2).max(32),
  costCenterName: z.string().min(2),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

const gradeSchema = z.object({
  gradeCode: z.string().min(1).max(32),
  gradeName: z.string().max(128).optional(),
  salaryMin: z.string().max(32).optional(),
  salaryMax: z.string().max(32).optional(),
});

const positionSchema = z.object({
  organizationId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  jobGradeId: z.string().uuid().optional(),
  positionCode: z.string().min(1).max(32),
  positionName: z.string().min(1),
  description: z.string().max(500).optional(),
});

const reportingLineSchema = z.object({
  employeeUserId: z.string().uuid(),
  managerUserId: z.string().uuid(),
  effectiveDate: z.string().date(),
  endDate: z.string().date().optional(),
});

export async function mustOrg(db: Db, tenantId: string, organizationId: string) {
  const rows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.id, organizationId),
        eq(organizations.tenantId, tenantId),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundException('organisasi tidak ditemukan di tenant ini');
}

@Injectable()
export class OrgService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ---- organizations ----
  async listOrgs(tenantId: string) {
    return this.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.tenantId, tenantId), isNull(organizations.deletedAt)));
  }

  async createOrg(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto = orgSchema.parse(body);
    const [row] = await this.db
      .insert(organizations)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    await this.audit.write(tenantId, actor, ip, {
      entityType: 'organizations',
      entityId: row.id,
      action: 'create',
      newValues: dto,
    });
    return row;
  }

  // ---- branches ----
  async listBranches(tenantId: string) {
    return this.db
      .select()
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), isNull(branches.deletedAt)));
  }

  async createBranch(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto = branchSchema.parse(body);
    await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(branches)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    await this.audit.write(tenantId, actor, ip, {
      entityType: 'branches',
      entityId: row.id,
      action: 'create',
      newValues: dto,
    });
    return row;
  }

  // ---- departments ----
  async listDepartments(tenantId: string) {
    return this.db
      .select()
      .from(departments)
      .where(and(eq(departments.tenantId, tenantId), isNull(departments.deletedAt)));
  }

  async createDepartment(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto = deptSchema.parse(body);
    await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(departments)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    await this.audit.write(tenantId, actor, ip, {
      entityType: 'departments',
      entityId: row.id,
      action: 'create',
      newValues: dto,
    });
    return row;
  }

  // ---- cost centers ----
  async listCostCenters(tenantId: string) {
    return this.db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.tenantId, tenantId), isNull(costCenters.deletedAt)));
  }

  async createCostCenter(tenantId: string, body: unknown, actor: string, ip: string | null) {
    const dto = costCenterSchema.parse(body);
    await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(costCenters)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    await this.audit.write(tenantId, actor, ip, {
      entityType: 'cost_centers',
      entityId: row.id,
      action: 'create',
      newValues: dto,
    });
    return row;
  }

  // ---- job grades & positions ----
  async listGrades(tenantId: string) {
    return this.db
      .select()
      .from(jobGrades)
      .where(and(eq(jobGrades.tenantId, tenantId), isNull(jobGrades.deletedAt)));
  }

  async createGrade(tenantId: string, body: unknown, actor: string) {
    const dto = gradeSchema.parse(body);
    const [row] = await this.db
      .insert(jobGrades)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async listPositions(tenantId: string) {
    return this.db
      .select()
      .from(jobPositions)
      .where(and(eq(jobPositions.tenantId, tenantId), isNull(jobPositions.deletedAt)));
  }

  async createPosition(tenantId: string, body: unknown, actor: string) {
    const dto = positionSchema.parse(body);
    await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(jobPositions)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  // ---- reporting lines ----
  async listReportingLines(tenantId: string) {
    return this.db
      .select()
      .from(reportingLines)
      .where(and(eq(reportingLines.tenantId, tenantId), isNull(reportingLines.deletedAt)));
  }

  async createReportingLine(tenantId: string, body: unknown, actor: string) {
    const dto = reportingLineSchema.parse(body);
    const [row] = await this.db
      .insert(reportingLines)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }
}
