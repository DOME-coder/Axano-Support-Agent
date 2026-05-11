import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  INTERNAL_TOKEN_PREFIX,
  constantTimeEqualHex,
  hashInternalToken,
  looksLikeInternalToken,
} from './internal-service.util';
import type { RequestWithTenant } from './tenant-api-key.guard';

interface InternalRequest extends RequestWithTenant {
  isInternal?: boolean;
}

@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<InternalRequest>();
    const header = request.header('x-internal-token');

    if (!header || !looksLikeInternalToken(header)) {
      throw new UnauthorizedException('missing or malformed X-Internal-Token header');
    }

    const expectedHash = process.env.INTERNAL_SERVICE_TOKEN_HASH;
    if (!expectedHash) {
      this.logger.error('INTERNAL_SERVICE_TOKEN_HASH not set — refusing all internal requests');
      throw new UnauthorizedException('internal service auth not configured');
    }

    const providedHash = hashInternalToken(header);
    if (!constantTimeEqualHex(providedHash, expectedHash)) {
      this.logger.warn(
        `internal auth rejected: prefix=${INTERNAL_TOKEN_PREFIX} hash_tail=${providedHash.slice(-4)}`,
      );
      throw new UnauthorizedException('invalid X-Internal-Token');
    }

    request.isInternal = true;
    return true;
  }
}
