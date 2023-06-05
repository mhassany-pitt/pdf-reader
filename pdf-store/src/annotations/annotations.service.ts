import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Annotation } from './annotation.schema';
import { toObject } from 'src/utils';

@Injectable()
export class AnnotationsService {

  constructor(
    private config: ConfigService,
    @InjectModel('annotations') private annotations: Model<Annotation>
  ) { }

  async list({ user, groupId }) {
    const list = await this.annotations.find({
      user_id: user?.id,
      group_id: groupId
    });
    return list.map(toObject);
  }

  async create({ user, groupId, annotation }) {
    return toObject(await this.annotations.create({
      ...annotation,
      user_id: user?.id,
      group_id: groupId,
      created_at: new Date().toISOString()
    }));
  }

  async read({ user, groupId, id }) {
    return toObject(await this.annotations.findOne(
      { user_id: user?.id, group_id: groupId, _id: id }
    ));
  }

  async update({ user, groupId, id, annotation }) {
    await this.annotations.updateOne(
      { user_id: user?.id, group_id: groupId, _id: id },
      { $set: { ...annotation } }
    );
    return this.read({ user, groupId, id });
  }

  async delete({ user, groupId, id }) {
    await this.annotations.deleteOne(
      { user_id: user?.id, group_id: groupId, _id: id }
    );
  }
}
