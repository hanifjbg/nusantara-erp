import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, lte } from 'drizzle-orm';
import { z } from 'zod';
import { computeTax, convertCurrency } from '@nusantara-erp/domain-master-data';
import { DB, type Db } from '../db.provider';
import {
  chartOfAccounts,
  currencies,
  exchangeRates,
  fiscalPeriods,
  taxCodes,
} from '../db/schema';
import { mustOrg } from '../org/org.service';

const currencySchema = z.object({
  currencyCode: z.string().length(3),
  currencyName: z.string().min(2).max(64),
  symbol: z.string().max(8).optional(),
  decimalPlaces: z.number().int().min(0).max(6).default(2),
});

const COMMON_ISO: Array<{ currencyCode: string; currencyName: string; symbol: string; decimalPlaces: number }> = [
  { currencyCode: 'IDR', currencyName: 'Rupiah Indonesia', symbol: 'Rp', decimalPlaces: 0 },
  { currencyCode: 'USD', currencyName: 'US Dollar', symbol: '$', decimalPlaces: 2 },
  { currencyCode: 'EUR', currencyName: 'Euro', symbol: '€', decimalPlaces: 2 },
  { currencyCode: 'SGD', currencyName: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { currencyCode: 'MYR', currencyName: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2 },
  { currencyCode: 'JPY', currencyName: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
  { currencyCode: 'AUD', currencyName: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
  { currencyCode: 'CNY', currencyName: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2 },
  { currencyCode: 'GBP', currencyName: 'British Pound', symbol: '£', decimalPlaces: 2 },
  { currencyCode: 'THB', currencyName: 'Thai Baht', symbol: '฿', decimalPlaces: 2 },
];

const rateSchema = z.object({
  baseCode: z.string().length(3),
  targetCode: z.string().length(3),
  rate: z.string().max(32),
  effectiveDate: z.string().date(),
});

const coaSchema = z.object({
  organizationId: z.string().uuid().optional(),
  accountCode: z.string().min(1).max(32),
  accountName: z.string().min(1).max(128),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense', 'other']),
  parentAccountId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

const fiscalSchema = z.object({
  organizationId: z.string().uuid().optional(),
  periodName: z.string().min(1).max(64),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

const taxSchema = z.object({
  taxCode: z.string().min(1).max(32),
  taxName: z.string().min(1).max(128),
  taxType: z.string().min(1).max(32),
  ratePercentage: z.string().max(16),
  effectiveDate: z.string().date(),
});

async function currencyId(db: Db, code: string) {
  const rows = await db
    .select({ id: currencies.id })
    .from(currencies)
    .where(and(eq(currencies.currencyCode, code), isNull(currencies.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException(`currency ${code} tidak dikenal`);
  return rows[0].id;
}

@Injectable()
export class FinanceMasterService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ---- currencies (global) ----
  async listCurrencies() {
    return this.db.select().from(currencies).where(isNull(currencies.deletedAt));
  }

  async createCurrency(body: unknown, actor: string) {
    const dto = currencySchema.parse(body);
    const [row] = await this.db
      .insert(currencies)
      .values({ ...dto, createdBy: actor })
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async seedCurrencies(actor: string) {
    await this.db.insert(currencies).values(COMMON_ISO.map((c) => ({ ...c, createdBy: actor }))).onConflictDoNothing();
    return this.listCurrencies();
  }

  // ---- exchange rates ----
  async listRates(tenantId: string) {
    return this.db
      .select()
      .from(exchangeRates)
      .where(and(eq(exchangeRates.tenantId, tenantId), isNull(exchangeRates.deletedAt)))
      .orderBy(desc(exchangeRates.effectiveDate));
  }

  async createRate(tenantId: string, body: unknown, actor: string) {
    const dto = rateSchema.parse(body);
    const [baseId, targetId] = await Promise.all([
      currencyId(this.db, dto.baseCode),
      currencyId(this.db, dto.targetCode),
    ]);
    const [row] = await this.db
      .insert(exchangeRates)
      .values({
        tenantId,
        baseCurrencyId: baseId,
        targetCurrencyId: targetId,
        rate: dto.rate,
        effectiveDate: dto.effectiveDate,
        createdBy: actor,
      })
      .returning();
    return row;
  }

  /** Konversi dengan kurs terakhir yang berlaku ≤ tanggal (tenant-scoped). */
  async convert(tenantId: string, body: unknown): Promise<{ converted: string; rate: string }> {
    const dto = z
      .object({
        amount: z.string().max(32),
        baseCode: z.string().length(3),
        targetCode: z.string().length(3),
        date: z.string().date().optional(),
      })
      .parse(body);
    if (dto.baseCode === dto.targetCode) return { converted: dto.amount, rate: '1' };
    const [baseId, targetId] = await Promise.all([
      currencyId(this.db, dto.baseCode),
      currencyId(this.db, dto.targetCode),
    ]);
    const rows = await this.db
      .select({ rate: exchangeRates.rate })
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.tenantId, tenantId),
          eq(exchangeRates.baseCurrencyId, baseId),
          eq(exchangeRates.targetCurrencyId, targetId),
          dto.date ? lte(exchangeRates.effectiveDate, dto.date) : isNull(exchangeRates.deletedAt),
          isNull(exchangeRates.deletedAt),
        ),
      )
      .orderBy(desc(exchangeRates.effectiveDate))
      .limit(1);
    if (!rows[0]) throw new NotFoundException('kurs tidak ditemukan');
    return { converted: convertCurrency(dto.amount, rows[0].rate), rate: rows[0].rate };
  }

  // ---- chart of accounts ----
  async listCoa(tenantId: string) {
    return this.db
      .select()
      .from(chartOfAccounts)
      .where(and(eq(chartOfAccounts.tenantId, tenantId), isNull(chartOfAccounts.deletedAt)));
  }

  async createCoa(tenantId: string, body: unknown, actor: string) {
    const dto = coaSchema.parse(body);
    if (dto.organizationId) await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(chartOfAccounts)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  // ---- fiscal periods ----
  async listFiscal(tenantId: string) {
    return this.db
      .select()
      .from(fiscalPeriods)
      .where(and(eq(fiscalPeriods.tenantId, tenantId), isNull(fiscalPeriods.deletedAt)));
  }

  async createFiscal(tenantId: string, body: unknown, actor: string) {
    const dto = fiscalSchema.parse(body);
    if (dto.organizationId) await mustOrg(this.db, tenantId, dto.organizationId);
    // Acceptance: no overlap dalam scope yang sama (tenant-global vs per-org terpisah).
    const existing = await this.db
      .select({
        organizationId: fiscalPeriods.organizationId,
        startDate: fiscalPeriods.startDate,
        endDate: fiscalPeriods.endDate,
      })
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.tenantId, tenantId),
          isNull(fiscalPeriods.deletedAt),
          lte(fiscalPeriods.startDate, dto.endDate),
        ),
      );
    const overlap = existing.some(
      (p) => (p.organizationId ?? null) === (dto.organizationId ?? null) && p.endDate >= dto.startDate,
    );
    if (overlap) throw new ConflictException('periode fiskal overlap dengan periode berjalan');
    const [row] = await this.db
      .insert(fiscalPeriods)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async closeFiscal(tenantId: string, id: string) {
    const rows = await this.db
      .select({ id: fiscalPeriods.id })
      .from(fiscalPeriods)
      .where(
        and(eq(fiscalPeriods.id, id), eq(fiscalPeriods.tenantId, tenantId), isNull(fiscalPeriods.deletedAt)),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException('periode fiskal tidak ditemukan');
    const [row] = await this.db
      .update(fiscalPeriods)
      .set({ isClosed: true })
      .where(eq(fiscalPeriods.id, id))
      .returning();
    return row;
  }

  // ---- tax codes ----
  async listTax(tenantId: string) {
    return this.db
      .select()
      .from(taxCodes)
      .where(and(eq(taxCodes.tenantId, tenantId), isNull(taxCodes.deletedAt)));
  }

  async createTax(tenantId: string, body: unknown, actor: string) {
    const dto = taxSchema.parse(body);
    const [row] = await this.db
      .insert(taxCodes)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async computeTax(tenantId: string, body: unknown): Promise<{ tax: string; total: string }> {
    const dto = z
      .object({ base: z.string().max(32), taxCode: z.string().min(1), date: z.string().date().optional() })
      .parse(body);
    // Multi-rate: pakai tarif efektif terbaru ≤ tanggal (fallback: terbaru apa pun).
    const asOf = dto.date ?? new Date().toISOString().slice(0, 10);
    const pick = async (onlyEffective: boolean) =>
      this.db
        .select({ ratePercentage: taxCodes.ratePercentage })
        .from(taxCodes)
        .where(
          and(
            eq(taxCodes.tenantId, tenantId),
            eq(taxCodes.taxCode, dto.taxCode),
            onlyEffective ? lte(taxCodes.effectiveDate, asOf) : isNull(taxCodes.deletedAt),
            isNull(taxCodes.deletedAt),
          ),
        )
        .orderBy(desc(taxCodes.effectiveDate))
        .limit(1);
    const eff = await pick(true);
    const rows = eff.length > 0 ? eff : await pick(false);
    if (!rows[0]) throw new NotFoundException('tax code tidak ditemukan');
    const tax = computeTax(dto.base, rows[0].ratePercentage);
    return { tax, total: (Number(dto.base) + Number(tax)).toFixed(4) };
  }
}
