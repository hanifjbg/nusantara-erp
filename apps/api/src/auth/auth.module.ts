import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { dbProvider } from '../db.provider';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, dbProvider],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
