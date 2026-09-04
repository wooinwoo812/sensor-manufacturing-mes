import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService, readSessionToken, serializeSessionCookie } from "./auth.service.js";
import { assertJsonRequest, type HttpRequest, type HttpResponse } from "./auth.http.js";
import { CsrfGuard, SessionGuard } from "./auth.guards.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  async login(
    @Body() input: unknown,
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    assertJsonRequest(request);
    const login = await this.authService.login(input, readSessionToken(request));
    response.setHeader("Set-Cookie", serializeSessionCookie(login.rawToken));
    return login.response;
  }

  @Get("me")
  @Header("Cache-Control", "no-store")
  @UseGuards(SessionGuard)
  async me(@Req() request: HttpRequest) {
    const session = await this.authService.authenticateRequest(request);
    return this.authService.toResponse(session);
  }

  @Post("logout")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @UseGuards(SessionGuard, CsrfGuard)
  async logout(
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: HttpResponse,
  ) {
    const session = await this.authService.authenticateRequest(request);
    await this.authService.logout(session.sessionId);
    response.setHeader("Set-Cookie", serializeSessionCookie("", true));
    return { ok: true };
  }
}
