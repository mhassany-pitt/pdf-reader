import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Preference } from './preference.schema';
import { toObject } from 'src/utils';

@Injectable()
export class PreferencesService {

  constructor(
    private config: ConfigService,
    @InjectModel('preferences') private preferences: Model<Preference>
  ) { }


  async create({ user_id, key, value }) {
    return toObject(await this.preferences.create({
      user_id, key, value,
      created_at: new Date().toISOString()
    }));
  }

  async read({ user_id, key }) {
    return toObject(await this.preferences.findOne({ user_id, key }));
  }

  async update({ user_id, key, value }) {
    await this.preferences.updateOne({ user_id, key }, { $set: { value } });
    return this.read({ user_id, key });
  }

  async delete({ user_id, key }) {
    await this.preferences.deleteOne({ user_id, key });
  }
}
