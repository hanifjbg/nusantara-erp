import { Body, Inject, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser } from '../common/current-user';
import { Public } from '../common/decorators';
import type { JwtPayload } from '../common/crypto';
import { reqMeta as metaOf } from '../common/http';
import { AuthService } from './auth.service';

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('bootstrap')
  bootstrap(@Body() body: unknown) {
    return this.auth.bootstrap(body);
  }

  @Public()
  @Post('login')
  login(@Body() body: unknown, @Req() req: Request) {
    return this.auth.login(body, metaOf(req));
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: unknown, @Req() req: Request) {
    const { refreshToken } = refreshSchema.parse(body);
    return this.auth.refresh(refreshToken, metaOf(req));
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@CurrentUser() user: JwtPayload, @Headers('x-refresh-token') refreshToken?: string) {
    return this.auth.logout(user.sub, refreshToken).then(() => ({ ok: true }));
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user);
  }
}
