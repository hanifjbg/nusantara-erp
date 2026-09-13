import { Inject, Injectable } from '@nestjs/common';
import { auditLogs } from '../db/schema';
import { DB, type Db } from '../db.provider';

export interface AuditEntry {
  entityType: string;
  entityId?: string;
  action: string;
  oldValues?: unknown;
  newValues?: unknown;
}

/** Penulis audit log (append-only → parent terpartisi, routing otomatis by created_at). */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async write(
    tenantId: string,
    actorUserId: string | null,
    ip: string | null,
    entry: AuditEntry,
  ): Promise<void> {
    await this.db.insert(auditLogs).values({
      tenantId,
      actorUserId,
      ipAddress: ip,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValues: (entry.oldValues ?? null) as never,
      newValues: (entry.newValues ?? null) as never,
    });
  }
}
