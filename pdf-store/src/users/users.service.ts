import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export type User = {
  id: number;
  fullname: string;
  email: string;
  password: string;
};

@Injectable()
export class UsersService {

  constructor(
    @InjectModel('users') private users: Model<User>
  ) { }

  async findOne(email: string): Promise<User | undefined> {
    return (await this.users.findOne({ email })).toObject();
  }
}