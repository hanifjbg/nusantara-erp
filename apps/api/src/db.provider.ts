import { Provider } from '@nestjs/common';
import { db, type Db } from './db/client';

export const DB = Symbol('DB');
export type { Db };

export const dbProvider: Provider = { provide: DB, useValue: db };
