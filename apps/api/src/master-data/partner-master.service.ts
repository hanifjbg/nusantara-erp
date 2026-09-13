import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DB, type Db } from '../db.provider';
import { addresses } from '../db/schema';
import {
  customerAddresses,
  customerContacts,
  customers,
  vendorContacts,
  vendors,
} from '../db/schema';
import { mustOrg } from '../org/org.service';

const customerSchema = z.object({
  organizationId: z.string().uuid().optional(),
  customerCode: z.string().min(1).max(64),
  customerName: z.string().min(1).max(128),
  npwp: z.string().max(32).optional(),
  contactPerson: z.string().max(128).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  website: z.string().max(128).optional(),
  customerType: z.string().max(32).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const contactSchema = z.object({
  contactName: z.string().min(1).max(128),
  position: z.string().max(64).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  isPrimary: z.boolean().default(false),
});

const linkAddressSchema = z.object({
  addressId: z.string().uuid(),
  isDefault: z.boolean().default(false),
});

const vendorSchema = z.object({
  organizationId: z.string().uuid().optional(),
  vendorCode: z.string().min(1).max(64),
  vendorName: z.string().min(1).max(128),
  npwp: z.string().max(32).optional(),
  contactPerson: z.string().max(128).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().optional(),
  website: z.string().max(128).optional(),
  bankAccountNumber: z.string().max(64).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

async function mustCustomer(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId), isNull(customers.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('customer tidak ditemukan di tenant ini');
}

async function mustVendor(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(and(eq(vendors.id, id), eq(vendors.tenantId, tenantId), isNull(vendors.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('vendor tidak ditemukan di tenant ini');
}

async function mustAddress(db: Db, tenantId: string, id: string) {
  const rows = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.tenantId, tenantId), isNull(addresses.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundException('address tidak ditemukan di tenant ini');
}

@Injectable()
export class PartnerMasterService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ---- customers ----
  async listCustomers(tenantId: string) {
    return this.db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), isNull(customers.deletedAt)));
  }

  async createCustomer(tenantId: string, body: unknown, actor: string) {
    const dto = customerSchema.parse(body);
    if (dto.organizationId) await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(customers)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async addContact(tenantId: string, customerId: string, body: unknown, actor: string) {
    const dto = contactSchema.parse(body);
    await mustCustomer(this.db, tenantId, customerId);
    const [row] = await this.db
      .insert(customerContacts)
      .values({ tenantId, customerId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async linkAddress(tenantId: string, customerId: string, body: unknown, actor: string) {
    const dto = linkAddressSchema.parse(body);
    await mustCustomer(this.db, tenantId, customerId);
    await mustAddress(this.db, tenantId, dto.addressId);
    const [row] = await this.db
      .insert(customerAddresses)
      .values({ tenantId, customerId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  // ---- vendors ----
  async listVendors(tenantId: string) {
    return this.db
      .select()
      .from(vendors)
      .where(and(eq(vendors.tenantId, tenantId), isNull(vendors.deletedAt)));
  }

  async createVendor(tenantId: string, body: unknown, actor: string) {
    const dto = vendorSchema.parse(body);
    if (dto.organizationId) await mustOrg(this.db, tenantId, dto.organizationId);
    const [row] = await this.db
      .insert(vendors)
      .values({ tenantId, ...dto, createdBy: actor })
      .returning();
    return row;
  }

  async addVendorContact(tenantId: string, vendorId: string, body: unknown, actor: string) {
    const dto = contactSchema.parse(body);
    await mustVendor(this.db, tenantId, vendorId);
    const [row] = await this.db
      .insert(vendorContacts)
      .values({ tenantId, vendorId, ...dto, createdBy: actor })
      .returning();
    return row;
  }
}
