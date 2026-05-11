import { Module } from '@nestjs/common';
import { RoomServiceClient } from './room-service.factory';
import { TokenIssuerService } from './token-issuer.service';

@Module({
  providers: [TokenIssuerService, RoomServiceClient],
  exports: [TokenIssuerService, RoomServiceClient],
})
export class LivekitModule {}
