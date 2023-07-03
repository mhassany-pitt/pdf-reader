import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {

  constructor(private readonly mailerService: MailerService) { }

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

// // --- send email
// this.mailerService.sendMail({
//   to: 'test@nestjs.com',
//   from: 'noreply@nestjs.com',
//   subject: 'Testing Nest Mailermodule with template ✔',
//   template: 'register/send-code',
//   context: {  // Data to be sent to template engine.
//     code: 'cf1a3f828287',
//     username: 'john doe',
//   },
// }).then((success) => {
//   console.log(success)
// }).catch((err) => {
//   console.log(err)
// });
// return {};