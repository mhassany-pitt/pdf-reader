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

  async list({ user, groupId, annotators }) {
    const filter: any = { group_id: groupId };
    if (annotators == 'all') { }
    else if (annotators == 'none') filter.user_id = user?.id;
    else {
      if (user?.id) annotators += ',' + user?.id;
      filter.user_id = { $in: annotators.split(',') };
    }
    return (await this.annotations.find(filter)).map(toObject);
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

  async getAnnotators({ groupId }) {
    return await this.annotations.find({ group_id: groupId }).distinct('user_id');
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
