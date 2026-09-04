import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service.js";
import { hasPermissions, type Permission } from "./auth.contract.js";
import {
  assertAllowedOrigin,
  headerValue,
  type HttpRequest,
  isUnsafeMethod,
  safeTokenEqual,
} from "./auth.http.js";

const requiredPermissionsKey = "required-permissions";

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(requiredPermissionsKey, permissions);

@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    assertAllowedOrigin(context.switchToHttp().getRequest<HttpRequest>());
    return true;
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    await this.authService.authenticateRequest(
      context.switchToHttp().getRequest<HttpRequest>(),
    );
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    if (!isUnsafeMethod(request.method)) {
      return true;
    }

    const session = await this.authService.authenticateRequest(request);
    if (!safeTokenEqual(headerValue(request, "x-csrf-token"), session.csrfToken)) {
      throw new ForbiddenException({
        code: "CSRF_REJECTED",
        message: "요청 검증 정보가 올바르지 않습니다.",
      });
    }
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required =
      this.reflector.getAllAndOverride<readonly Permission[]>(
        requiredPermissionsKey,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    const session = await this.authService.authenticateRequest(
      context.switchToHttp().getRequest<HttpRequest>(),
    );

    if (!hasPermissions(session.activeRole, required)) {
      throw new ForbiddenException({
        code: "PERMISSION_DENIED",
        message: "현재 역할에 필요한 권한이 없습니다.",
        requiredPermissions: required,
      });
    }
    return true;
  }
}
