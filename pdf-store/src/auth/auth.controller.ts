import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {

  @Get('handshake')
  handshake(@Req() request: any) {
    return {
      user: request.user
    };
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() request: any) {
    return request.user;
  }

  @Post('logout')
  @UseGuards(AuthenticatedGuard)
  logout(@Req() req: any) {
    req.session.destroy();
    return {};
  }
}
