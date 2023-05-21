import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {

  constructor(private usersService: UsersService) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (user && await compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}