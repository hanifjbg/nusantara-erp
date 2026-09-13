import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { DB, type Db } from '../db.provider';
import {
  addresses,
  cities,
  countries,
  districts,
  provinces,
  subDistricts,
} from '../db/schema';

export const addressSchema = z.object({
  provinceId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  subDistrictId: z.string().uuid().optional(),
  postalCode: z.string().max(16).optional(),
  label: z.string().max(64).optional(),
  addressLine1: z.string().min(1, 'alamat wajib'),
  addressLine2: z.string().max(500).optional(),
  isPrimary: z.boolean().default(false),
});

@Injectable()
export class GeoService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Referensi global — tanpa tenant filter (bukan data tenant).
  async listCountries() {
    return this.db.select().from(countries).where(isNull(countries.deletedAt));
  }

  async listProvinces(countryId?: string) {
    const conds = [isNull(provinces.deletedAt)];
    if (countryId) conds.push(eq(provinces.countryId, countryId));
    return this.db
      .select()
      .from(provinces)
      .where(conds.length > 1 ? and(...conds) : conds[0]);
  }

  async listCities(provinceId?: string) {
    const conds = [isNull(cities.deletedAt)];
    if (provinceId) conds.push(eq(cities.provinceId, provinceId));
    return this.db
      .select()
      .from(cities)
      .where(conds.length > 1 ? and(...conds) : conds[0]);
  }

  async listDistricts(cityId?: string) {
    const conds = [isNull(districts.deletedAt)];
    if (cityId) conds.push(eq(districts.cityId, cityId));
    return this.db
      .select()
      .from(districts)
      .where(conds.length > 1 ? and(...conds) : conds[0]);
  }

  async listSubDistricts(districtId?: string) {
    const conds = [isNull(subDistricts.deletedAt)];
    if (districtId) conds.push(eq(subDistricts.districtId, districtId));
    return this.db
      .select()
      .from(subDistricts)
      .where(conds.length > 1 ? and(...conds) : conds[0]);
  }

  async listAddresses(tenantId: string) {
    return this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.tenantId, tenantId), isNull(addresses.deletedAt)));
  }

  async createAddress(tenantId: string, body: unknown, actorUserId: string) {
    const dto = addressSchema.parse(body);
    const [row] = await this.db
      .insert(addresses)
      .values({ tenantId, ...dto, createdBy: actorUserId })
      .returning();
    return row;
  }
}
