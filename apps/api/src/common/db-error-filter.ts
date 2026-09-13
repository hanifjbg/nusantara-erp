import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
} from '@nestjs/common';

/**
 * Error Postgres umum → HTTP ramah (bukan 500):
 * - 23505 unique violation → 409 (mis. kode ganda di tenant aktif)
 * - 23503 foreign key violation → 400
 * Lainnya dilempar ulang.
 */
@Catch()
export class DbErrorFilter implements ExceptionFilter {
  catch(exception: unknown, _host: ArgumentsHost) {
    // Drizzle membungkus PostgresError di .cause (postgres-js driver).
    const err = exception as { code?: string; cause?: { code?: string } };
    const code = err?.code ?? err?.cause?.code;
    if (code === '23505') {
      throw new ConflictException('data duplikat (kode sudah dipakai)');
    }
    if (code === '23503') {
      throw new BadRequestException('referensi tidak valid');
    }
    throw exception;
  }
}
