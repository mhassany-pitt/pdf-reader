import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { useId } from 'src/utils';

@Injectable()
export class AuthService {

  constructor(private users: UsersService) { }

  async validateUser(email: string, password: string) {
    const user = useId(await this.users.findOne(email));
    if (user && await compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}