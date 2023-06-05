import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { toObject } from 'src/utils';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel('users') private users: Model<User>
  ) { }

  async findUser(email: string) {
    return toObject(await this.users.findOne({ email }));
  }

  async findAPIUser(apiKey: string) {
    return toObject(await this.users.findOne({ apiKey, userType: 'api' }));
  }
}