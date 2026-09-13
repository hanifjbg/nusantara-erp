import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { nextStep } from '@nusantara-erp/domain-workflow';
import { AuditService } from '../common/audit';
import type { JwtPayload } from '../common/crypto';
import { DB, type Db } from '../db.provider';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
  workflowApprovalActions,
  workflowDefinitions,
  workflowInstances,
  workflowSteps,
} from '../db/schema';

export const definitionSchema = z.object({
  moduleCode: z.string().min(1).max(64),
  documentType: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const stepSchema = z.object({
  stepOrder: z.number().int().min(1).max(100),
  approverType: z.enum(['role', 'user', 'permission']),
  approverReferenceId: z.string().uuid().optional(),
  stepName: z.string().min(1).max(128),
  conditionJson: z.unknown().optional(),
  slaHours: z.number().int().min(1).max(720).optional(),
});

export const startInstanceSchema = z.object({
  definitionId: z.string().uuid().optional(),
  moduleCode: z.string().min(1).max(64).optional(),
  documentType: z.string().min(1).max(64).optional(),
  referenceType: z.string().min(1).max(64),
  referenceId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).default({}),
});

export const actionSchema = z.object({
  action: z.enum(['approved', 'rejected', 'reassigned']),
  comments: z.string().max(1000).optional(),
  reassignTo: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).default({}),
});

type Ctx = Record<string, unknown>;

async function mustDefinition(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select()
    .from(workflowDefinitions)
    .where(
      and(
        eq(workflowDefinitions.id, id),
        eq(workflowDefinitions.tenantId, tenantId),
        isNull(workflowDefinitions.deletedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundException('definisi workflow tidak ditemukan di tenant ini');
  return rows[0];
}

async function loadSteps(db: Db, definitionId: string) {
  return db
    .select()
    .from(workflowSteps)
    .where(and(eq(workflowSteps.workflowDefinitionId, definitionId), isNull(workflowSteps.deletedAt)))
    .orderBy(asc(workflowSteps.stepOrder));
}

@Injectable()
export class WorkflowService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ---- definitions ----
  async listDefinitions(tenantId: string) {
    return this.db
      .select()
      .from(workflowDefinitions)
      .where(and(eq(workflowDefinitions.tenantId, tenantId), isNull(workflowDefinitions.deletedAt)));
  }

  async createDefinition(tenantId: string, body: unknown, actor: string) {
    const dto = definitionSchema.parse(body);
    const [row] = await this.db
      .insert(workflowDefinitions)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async getDefinition(tenantId: string, id: string) {
    const def = await mustDefinition(this.db, tenantId, id);
    const steps = await loadSteps(this.db, id);
    return { ...def, steps };
  }

  // ---- steps ----
  async createStep(tenantId: string, definitionId: string, body: unknown, actor: string) {
    const dto = stepSchema.parse(body);
    await mustDefinition(this.db, tenantId, definitionId);
    if (dto.approverType === 'user' && dto.approverReferenceId) {
      await this.mustTenantUser(tenantId, dto.approverReferenceId);
    }
    if (dto.approverType === 'role' && dto.approverReferenceId) {
      await this.mustTenantRole(tenantId, dto.approverReferenceId);
    }
    const [row] = await this.db
      .insert(workflowSteps)
      .values({
        workflowDefinitionId: definitionId,
        stepOrder: dto.stepOrder,
        approverType: dto.approverType,
        approverReferenceId: dto.approverReferenceId,
        stepName: dto.stepName,
        conditionJson: (dto.conditionJson ?? null) as never,
        slaHours: dto.slaHours,
        createdBy: actor,
      })
      .returning();
    return row;
  }

  private async mustTenantUser(tenantId: string, userId: string) {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), isNull(users.deletedAt)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('user approver tidak ditemukan di tenant ini');
  }

  private async mustTenantRole(tenantId: string, roleId: string) {
    const rows = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId), isNull(roles.deletedAt)))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('role approver tidak ditemukan di tenant ini');
  }

  // ---- instances ----
  async listInstances(tenantId: string, filter: { status?: string; referenceType?: string }) {
    const conds = [eq(workflowInstances.tenantId, tenantId), isNull(workflowInstances.deletedAt)];
    if (filter.status) conds.push(eq(workflowInstances.status, filter.status));
    if (filter.referenceType) conds.push(eq(workflowInstances.referenceType, filter.referenceType));
    return this.db
      .select()
      .from(workflowInstances)
      .where(and(...conds));
  }

  async getInstance(tenantId: string, id: string) {
    const inst = await this.mustInstance(tenantId, id);
    const actions = await this.db
      .select()
      .from(workflowApprovalActions)
      .where(
        and(
          eq(workflowApprovalActions.workflowInstanceId, id),
          isNull(workflowApprovalActions.deletedAt),
        ),
      );
    return { ...inst, actions };
  }

  private async mustInstance(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(workflowInstances)
      .where(
        and(
          eq(workflowInstances.id, id),
          eq(workflowInstances.tenantId, tenantId),
          isNull(workflowInstances.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException('instance tidak ditemukan di tenant ini');
    return rows[0];
  }

  /**
   * Mulai instance: step pertama = nextStep(null, context). Tanpa step berlaku
   * → langsung approved (skeleton reusable Fase 4+: dokumen tanpa aturan = lolos).
   */
  async startInstance(tenantId: string, body: unknown, actorUserId: string, ip: string | null) {
    const dto = startInstanceSchema.parse(body);
    let defId = dto.definitionId;
    if (!defId) {
      if (!dto.moduleCode || !dto.documentType) {
        throw new NotFoundException('definitionId atau (moduleCode+documentType) wajib');
      }
      const defs = await this.db
        .select({ id: workflowDefinitions.id })
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.tenantId, tenantId),
            eq(workflowDefinitions.moduleCode, dto.moduleCode),
            eq(workflowDefinitions.documentType, dto.documentType),
            eq(workflowDefinitions.isActive, true),
            isNull(workflowDefinitions.deletedAt),
          ),
        )
        .limit(1);
      if (!defs[0]) throw new NotFoundException('definisi workflow aktif tidak ditemukan');
      defId = defs[0].id;
    }
    const def = await mustDefinition(this.db, tenantId, defId);
    if (!def.isActive) throw new ConflictException('definisi workflow nonaktif');

    const steps = await loadSteps(this.db, defId);
    const first = nextStep(
      steps.map((s) => ({ order: s.stepOrder, condition: s.conditionJson as unknown })),
      null,
      dto.context as Ctx,
    );
    const [inst] = await this.db
      .insert(workflowInstances)
      .values({
        tenantId,
        workflowDefinitionId: defId,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        currentStep: first?.order ?? null,
        initiatedBy: actorUserId,
        status: first ? 'pending' : 'approved',
        completedAt: first ? null : new Date(),
        createdBy: actorUserId,
        contextJson: dto.context as never,
      })
      .returning();
    await this.audit.write(tenantId, actorUserId, ip, {
      entityType: 'workflow_instances',
      entityId: inst.id,
      action: 'start',
      newValues: { definitionId: defId, referenceType: dto.referenceType },
    });
    return inst;
  }

  // ---- approval actions ----
  private async isEligible(
    tenantId: string,
    caller: JwtPayload,
    step: { approverType: string; approverReferenceId: string | null },
  ): Promise<boolean> {
    if (step.approverType === 'user') {
      return step.approverReferenceId === caller.sub;
    }
    if (step.approverType === 'permission') {
      if (!step.approverReferenceId) return false;
      const rows = await this.db
        .select({ permissionCode: permissions.permissionCode })
        .from(permissions)
        .where(and(eq(permissions.id, step.approverReferenceId), isNull(permissions.deletedAt)))
        .limit(1);
      return !!rows[0] && caller.permissions.includes(rows[0].permissionCode);
    }
    if (step.approverType === 'role') {
      if (!step.approverReferenceId) return false;
      const rows = await this.db
        .select({ id: roles.id })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, caller.sub),
            eq(roles.id, step.approverReferenceId),
            eq(roles.tenantId, tenantId),
            isNull(userRoles.deletedAt),
            isNull(roles.deletedAt),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }
    return false;
  }

  async act(
    tenantId: string,
    instanceId: string,
    body: unknown,
    caller: JwtPayload,
    ip: string | null,
  ) {
    const dto = actionSchema.parse(body);
    const inst = await this.mustInstance(tenantId, instanceId);
    if (inst.status !== 'pending' || inst.currentStep === null) {
      throw new ConflictException(`instance sudah ${inst.status} (no double action)`);
    }

    const steps = await loadSteps(this.db, inst.workflowDefinitionId);
    const step = steps.find((s) => s.stepOrder === inst.currentStep);
    if (!step) throw new ConflictException('step berjalan tidak ditemukan');

    if (!(await this.isEligible(tenantId, caller, step))) {
      throw new ForbiddenException('bukan approver step ini');
    }

    // Guard ganda sebelum partial unique DB: keputusan final sudah ada?
    const finals = await this.db
      .select({ id: workflowApprovalActions.id })
      .from(workflowApprovalActions)
      .where(
        and(
          eq(workflowApprovalActions.workflowInstanceId, instanceId),
          eq(workflowApprovalActions.stepId, step.id),
          isNull(workflowApprovalActions.deletedAt),
        ),
      );
    // (Cek kasar; keunikan final ditegakkan partial unique index.)
    if (dto.action !== 'reassigned' && finals.length > 0) {
      const decided = await this.db
        .select()
        .from(workflowApprovalActions)
        .where(
          and(
            eq(workflowApprovalActions.workflowInstanceId, instanceId),
            eq(workflowApprovalActions.stepId, step.id),
            isNull(workflowApprovalActions.deletedAt),
          ),
        );
      if (decided.some((a) => a.action === 'approved' || a.action === 'rejected')) {
        throw new ConflictException('step sudah diputus (no double approve)');
      }
    }

    if (dto.action === 'reassigned') {
      if (!dto.reassignTo) throw new ConflictException('reassignTo wajib untuk reassign');
      if (step.approverType === 'user') {
        await this.mustTenantUser(tenantId, dto.reassignTo);
        await this.db
          .update(workflowSteps)
          .set({ approverReferenceId: dto.reassignTo })
          .where(eq(workflowSteps.id, step.id));
      }
      const [row] = await this.db
        .insert(workflowApprovalActions)
        .values({
          workflowInstanceId: instanceId,
          stepId: step.id,
          approverUserId: caller.sub,
          action: 'reassigned',
          comments: dto.comments,
          createdBy: caller.sub,
        })
        .returning();
      return { action: row, instance: await this.mustInstance(tenantId, instanceId) };
    }

    const [row] = await this.db
      .insert(workflowApprovalActions)
      .values({
        workflowInstanceId: instanceId,
        stepId: step.id,
        approverUserId: caller.sub,
        action: dto.action,
        comments: dto.comments,
        createdBy: caller.sub,
      })
      .returning();

    let updated;
    if (dto.action === 'rejected') {
      [updated] = await this.db
        .update(workflowInstances)
        .set({ status: 'rejected', completedAt: new Date(), updatedBy: caller.sub })
        .where(eq(workflowInstances.id, instanceId))
        .returning();
    } else {
      // Evaluasi branch terhadap konteks instance; context per-action (opsional)
      // di-merge sebagai override (mis. total terkoreksi saat approval).
      const evalCtx: Ctx = { ...((inst.contextJson as Ctx | null) ?? {}), ...dto.context };
      const next = nextStep(
        steps.map((s) => ({ order: s.stepOrder, condition: s.conditionJson as unknown })),
        inst.currentStep,
        evalCtx,
      );
      [updated] = await this.db
        .update(workflowInstances)
        .set(
          next
            ? { currentStep: next.order, updatedBy: caller.sub }
            : { status: 'approved', completedAt: new Date(), updatedBy: caller.sub },
        )
        .where(eq(workflowInstances.id, instanceId))
        .returning();
    }

    await this.audit.write(tenantId, caller.sub, ip, {
      entityType: 'workflow_instances',
      entityId: instanceId,
      action: dto.action,
      newValues: { status: updated.status, currentStep: updated.currentStep },
    });
    // Hook notifikasi (Fase 21: notifications/activity_logs) — dicatat di audit untuk sekarang.
    return { action: row, instance: updated };
  }
}
