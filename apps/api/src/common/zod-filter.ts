import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';

/** ZodError (validasi input) → 400 dengan detail issues (bukan 500). */
@Catch(ZodError)
export class ZodValidationFilter implements ExceptionFilter {
  catch(exception: ZodError, _host: ArgumentsHost) {
    throw new BadRequestException({
      message: 'validasi gagal',
      issues: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
}
