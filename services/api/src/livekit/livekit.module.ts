import { Module } from '@nestjs/common';
import { TokenIssuerService } from './token-issuer.service';

@Module({
  providers: [TokenIssuerService],
  exports: [TokenIssuerService],
})
export class LivekitModule {}
