import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as EmailValidator from 'email-validator';
import { hash } from 'bcryptjs';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';

@Controller('user-admin')
export class UserAdminController {

  constructor(private service: UsersService) { }

  private getMyEmail(req) {
    return req.user.email;
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async list(@Req() req) {
    const myEmail = this.getMyEmail(req);
    return (await this.service.list()).map((user: any) => {
      const { activate, fullname, email, roles } = user;
      const resp: any = { activate, fullname, email, roles };
      if (email == myEmail)
        resp.itIsMe = true;
      return resp;
    });
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req, @Body() { roles, emails }: any) {
    const myEmail = this.getMyEmail(req);
    const accounts = emails.split(',').map(text => {
      let [fullname, email] = text.split(':');
      fullname = fullname.trim();
      email = email.trim();
      if (!EmailValidator.validate(email))
        return null;
      return { fullname, email };
    }).filter(user => user && user.email != myEmail);

    for (const account of accounts) {
      const password = await hash(Math.random().toString(), 10);
      await this.service.create({ ...account, password, roles });
    }

    return {};
  }

  @Patch()
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req, @Body() { action, data }: any) {
    const myEmail = this.getMyEmail(req);
    if (action == 'update') {
      for (const user of data) {
        const { fullname, email, roles } = user;
        if (email == myEmail)
          continue;
        await this.service.update(email, { fullname, roles });
      }
    } else if (action == 'delete') {
      await this.service.remove(data.filter(email => email != myEmail));
    }

    return {};
  }
}