import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readJSONSync } from 'fs-extra';

export type User = {
  id: number;
  fullname: string;
  email: string;
  password: string;
};

@Injectable()
export class UsersService {

  constructor(
    private config: ConfigService,
  ) { }

  root(...path: string[]) {
    return this.config.get('STORAGE') + (path ? '/' + path.join('/') : '');
  }

  async findOne(email: string): Promise<User | undefined> {
    const users = readJSONSync(this.root('users/credentials.json'));
    return users.find(user => user.email === email);
  }
}