import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DB, type Db } from '../db.provider';
import {
  itemCategories,
  itemVariants,
  items,
  priceListItems,
  priceLists,
  unitsOfMeasure,
  uomConversions,
} from '../db/schema';
import { mustOrg } from '../org/org.service';

const uomSchema = z.object({
  uomCode: z.string().min(1).max(16),
  uomName: z.string().min(1).max(64),
  uomCategory: z.string().max(32).optional(),
  description: z.string().max(500).optional(),
});

const conversionSchema = z.object({
  fromCode: z.string().min(1),
  toCode: z.string().min(1),
  conversionFactor: z.string().max(32),
});

const categorySchema = z.object({
  categoryCode: z.string().min(1).max(32),
  categoryName: z.string().min(1).max(128),
  parentCategoryId: z.string().uuid().optional(),
});

const itemSchema = z.object({
  organizationId: z.string().uuid().optional(),
  itemCategoryId: z.string().uuid().optional(),
  uomId: z.string().uuid().optional(),
  itemCode: z.string().min(1).max(64),
  itemName: z.string().min(1).max(128),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(64).optional(),
  brand: z.string().max(64).optional(),
  isActive: z.boolean().default(true),
});

const variantSchema = z.object({
  itemId: z.string().uuid(),
  variantCode: z.string().min(1).max(64),
  variantName: z.string().min(1).max(128),
  additionalPrice: z.string().max(32).default('0'),
});

const priceListSchema = z.object({
  priceListName: z.string().min(1).max(128),
  currencyId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

const priceItemSchema = z.object({
  itemId: z.string().uuid(),
  unitPrice: z.string().max(32),
});

async function mustUom(db: Db, tenantId: string, code: string) {
  const rows = await db
    .select({ id: unitsOfMeasure.id })
    .from(unitsOfMeasure)
    .where(
      and(eq(unitsOfMeasure.uomCode, code), eq(unitsOfMeasure.tenantId, tenantId), isNull(unitsOfMeasure.deletedAt)),
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundException(`uom ${code} tidak ditemukan`);
  return rows[0].id;
}

async function mustItem(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.tenantId, tenantId), isNull(items.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('item tidak ditemukan di tenant ini');
}

async function mustPriceList(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: priceLists.id })
    .from(priceLists)
    .where(and(eq(priceLists.id, id), eq(priceLists.tenantId, tenantId), isNull(priceLists.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('price list tidak ditemukan di tenant ini');
}

@Injectable()
export class ItemMasterService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ---- UoM ----
  async listUoms(tenantId: string) {
    return this.db
      .select()
      .from(unitsOfMeasure)
      .where(and(eq(unitsOfMeasure.tenantId, tenantId), isNull(unitsOfMeasure.deletedAt)));
  }

  async createUom(tenantId: string, body: unknown, actor: string) {
    const dto = uomSchema.parse(body);
    const [row] = await this.db
      .insert(unitsOfMeasure)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async createConversion(tenantId: string, body: unknown, actor: string) {
    const dto = conversionSchema.parse(body);
    const [fromId, toId] = await Promise.all([
      mustUom(this.db, tenantId, dto.fromCode),
      mustUom(this.db, tenantId, dto.toCode),
    ]);
    const [row] = await this.db
      .insert(uomConversions)
      .values({ tenantId, fromUomId: fromId, toUomId: toId, conversionFactor: dto.conversionFactor, createdBy: actor })
      .returning();
    return row;
  }

  /** Konversi qty antar UoM via faktor terdaftar (tenant-scoped). */
  async convertQty(tenantId: string, body: unknown): Promise<{ qty: string }> {
    const dto = z.object({ qty: z.string().max(32), fromCode: z.string().min(1), toCode: z.string().min(1) }).parse(body);
    if (dto.fromCode === dto.toCode) return { qty: dto.qty };
    const [fromId, toId] = await Promise.all([
      mustUom(this.db, tenantId, dto.fromCode),
      mustUom(this.db, tenantId, dto.toCode),
    ]);
    const rows = await this.db
      .select({ conversionFactor: uomConversions.conversionFactor })
      .from(uomConversions)
      .where(
        and(
          eq(uomConversions.tenantId, tenantId),
          eq(uomConversions.fromUomId, fromId),
          eq(uomConversions.toUomId, toId),
          isNull(uomConversions.deletedAt),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new NotFoundException('konversi tidak terdaftar');
    return { qty: (Number(dto.qty) * Number(rows[0].conversionFactor)).toFixed(4) };
  }

  // ---- categories & items ----
  async listCategories(tenantId: string) {
    return this.db
      .select()
      .from(itemCategories)
      .where(and(eq(itemCategories.tenantId, tenantId), isNull(itemCategories.deletedAt)));
  }

  async createCategory(tenantId: string, body: unknown, actor: string) {
    const dto = categorySchema.parse(body);
    const [row] = await this.db
      .insert(itemCategories)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async listItems(tenantId: string) {
    return this.db
      .select()
      .from(items)
      .where(and(eq(items.tenantId, tenantId), isNull(items.deletedAt)));
  }

  async createItem(tenantId: string, body: unknown, actor: string) {
    const dto = itemSchema.parse(body);
    if (dto.organizationId) await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(items)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async createVariant(tenantId: string, body: unknown, actor: string) {
    const dto = variantSchema.parse(body);
    await mustItem(this.db, tenantId, dto.itemId);
    const [row] = await this.db
      .insert(itemVariants)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async listVariants(tenantId: string, itemId?: string) {
    const conds = [eq(itemVariants.tenantId, tenantId), isNull(itemVariants.deletedAt)];
    if (itemId) conds.push(eq(itemVariants.itemId, itemId));
    return this.db
      .select()
      .from(itemVariants)
      .where(and(...conds));
  }

  // ---- price lists ----
  async listPriceLists(tenantId: string) {
    return this.db
      .select()
      .from(priceLists)
      .where(and(eq(priceLists.tenantId, tenantId), isNull(priceLists.deletedAt)));
  }

  async createPriceList(tenantId: string, body: unknown, actor: string) {
    const dto = priceListSchema.parse(body);
    const [row] = await this.db
      .insert(priceLists)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async addPriceItem(tenantId: string, priceListId: string, body: unknown, actor: string) {
    const dto = priceItemSchema.parse(body);
    await mustPriceList(this.db, tenantId, priceListId);
    await mustItem(this.db, tenantId, dto.itemId);
    const [row] = await this.db
      .insert(priceListItems)
      .values({ priceListId, itemId: dto.itemId, unitPrice: dto.unitPrice, createdBy: actor })
      .returning();
    return row;
  }

  async listPriceItems(tenantId: string, priceListId: string) {
    await mustPriceList(this.db, tenantId, priceListId);
    return this.db
      .select()
      .from(priceListItems)
      .where(and(eq(priceListItems.priceListId, priceListId), isNull(priceListItems.deletedAt)));
  }
}
