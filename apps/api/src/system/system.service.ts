import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { formatDocumentNumber } from '@nusantara-erp/domain-org';
import { DB, type Db } from '../db.provider';
import { auditLogs, customFieldDefinitions, customFieldValues, numberSequences } from '../db/schema';

export const seqDefineSchema = z.object({
  documentType: z.string().min(2).max(64),
  formatPattern: z.string().min(1).max(128),
  prefix: z.string().max(32).optional(),
  organizationId: z.string().uuid().optional(),
  resetPeriod: z.enum(['never', 'yearly', 'monthly']).default('never'),
});

export const seqNextSchema = z.object({
  documentType: z.string().min(1),
  organizationId: z.string().uuid().optional(),
});

export const cfDefSchema = z.object({
  moduleCode: z.string().min(1).max(64),
  entityType: z.string().min(1).max(64),
  fieldKey: z.string().min(1).max(64),
  fieldLabel: z.string().min(1).max(128),
  fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select', 'json']),
  isRequired: z.boolean().default(false),
  optionsJson: z.unknown().optional(),
});

export const cfValueSchema = z.object({
  entityId: z.string().uuid(),
  valueText: z.string().max(2000).optional(),
  valueNumber: z.string().max(64).optional(),
  valueDate: z.string().date().optional(),
  valueJson: z.unknown().optional(),
});

@Injectable()
export class SystemService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ---- number_sequences ----
  async listSequences(tenantId: string) {
    return this.db
      .select()
      .from(numberSequences)
      .where(and(eq(numberSequences.tenantId, tenantId), isNull(numberSequences.deletedAt)));
  }

  async defineSequence(tenantId: string, body: unknown, actorUserId: string) {
    const dto = seqDefineSchema.parse(body);
    const [row] = await this.db
      .insert(numberSequences)
      .values({
        tenantId,
        documentType: dto.documentType,
        formatPattern: dto.formatPattern,
        prefix: dto.prefix,
        organizationId: dto.organizationId,
        resetPeriod: dto.resetPeriod,
        createdBy: actorUserId,
      })
      .returning();
    return row;
  }

  /**
   * Nomor berikutnya — atomik via next_number() (UPDATE ... RETURNING, row-lock).
   * Menerima format & increment per tenant (acceptance Fase 1).
   */
  async nextNumber(
    tenantId: string,
    body: unknown,
  ): Promise<{ seq: number; formatted: string }> {
    const dto = seqNextSchema.parse(body);
    // Ambil pola format dulu (tenant-filtered) agar format tak bisa dicuri lintas tenant.
    const defs = await this.db
      .select({
        formatPattern: numberSequences.formatPattern,
        prefix: numberSequences.prefix,
      })
      .from(numberSequences)
      .where(
        and(
          eq(numberSequences.tenantId, tenantId),
          eq(numberSequences.documentType, dto.documentType),
          dto.organizationId
            ? eq(numberSequences.organizationId, dto.organizationId)
            : isNull(numberSequences.organizationId),
          isNull(numberSequences.deletedAt),
        ),
      )
      .limit(1);
    if (!defs[0]) throw new NotFoundException('number sequence tidak didefinisikan');

    const res = await this.db.execute(
      sql`SELECT next_number(${tenantId}, ${dto.documentType}, ${dto.organizationId ?? null}) AS seq`,
    );
    const seq = Number((res[0] as unknown as { seq: string }).seq);
    return {
      seq,
      formatted: formatDocumentNumber(defs[0].formatPattern, seq, {
        prefix: defs[0].prefix,
      }),
    };
  }

  // ---- audit_logs (read, tenant-filtered) ----
  async listAudit(tenantId: string, filter: { entityType?: string; entityId?: string; limit?: number }) {
    const conds = [eq(auditLogs.tenantId, tenantId)];
    if (filter.entityType) conds.push(eq(auditLogs.entityType, filter.entityType));
    if (filter.entityId) conds.push(eq(auditLogs.entityId, filter.entityId));
    return this.db
      .select()
      .from(auditLogs)
      .where(and(...conds))
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(filter.limit ?? 50, 200));
  }

  // ---- custom fields ----
  async listFieldDefs(tenantId: string, entityType?: string) {
    const conds = [eq(customFieldDefinitions.tenantId, tenantId), isNull(customFieldDefinitions.deletedAt)];
    if (entityType) conds.push(eq(customFieldDefinitions.entityType, entityType));
    return this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(...conds));
  }

  async createFieldDef(tenantId: string, body: unknown, actorUserId: string) {
    const dto = cfDefSchema.parse(body);
    const [row] = await this.db
      .insert(customFieldDefinitions)
      .values({
        tenantId,
        ...dto,
        optionsJson: (dto.optionsJson ?? null) as never,
        createdBy: actorUserId,
      })
      .returning();
    return row;
  }

  async setFieldValue(tenantId: string, definitionId: string, body: unknown, actorUserId: string) {
    const dto = cfValueSchema.parse(body);
    const defs = await this.db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, definitionId),
          eq(customFieldDefinitions.tenantId, tenantId),
          isNull(customFieldDefinitions.deletedAt),
        ),
      )
      .limit(1);
    if (!defs[0]) throw new NotFoundException('definisi custom field tidak ditemukan');

    const existing = await this.db
      .select({ id: customFieldValues.id })
      .from(customFieldValues)
      .where(
        and(
          eq(customFieldValues.customFieldDefinitionId, definitionId),
          eq(customFieldValues.entityId, dto.entityId),
          eq(customFieldValues.tenantId, tenantId),
          isNull(customFieldValues.deletedAt),
        ),
      )
      .limit(1);
    const value = {
      tenantId,
      customFieldDefinitionId: definitionId,
      entityId: dto.entityId,
      valueText: dto.valueText,
      valueNumber: dto.valueNumber,
      valueDate: dto.valueDate,
      valueJson: (dto.valueJson ?? null) as never,
      createdBy: actorUserId,
    };
    if (existing[0]) {
      const [row] = await this.db
        .update(customFieldValues)
        .set({ ...value, updatedAt: new Date(), updatedBy: actorUserId })
        .where(eq(customFieldValues.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await this.db.insert(customFieldValues).values(value).returning();
    return row;
  }
}
