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

  async list() {
    return (await this.users.find()).map(toObject);
  }

  async create(model: any) {
    await this.users.create(model);
  }

  async update(email, model: any) {
    await this.users.updateOne({ email }, model);
  }

  async remove(emails) {
    await this.users.deleteMany({ email: { $in: emails } });
  }

  async findUser(email: string) {
    return toObject(await this.users.findOne({ email }));
  }

  async findAPIUser(apiKey: string) {
    return toObject(await this.users.findOne({ apiKey, userType: 'api' }));
  }

  async getUsers({ userIds }) {
    return (await this.users.find({ _id: { $in: userIds } })).map(toObject);
  }
}