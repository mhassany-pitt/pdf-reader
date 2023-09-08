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

  async list({ user_id, groupId, pages, annotators }) {
    const filter: any = { group_id: groupId };

    if (pages) {
      filter.pages = { $in: pages.split(',').map(p => parseInt(p)) };
    }

    if (annotators) {
      /**/ if (annotators == 'all') { }
      else if (annotators == 'none') {
        filter.user_id = user_id;
      } else {
        if (user_id) annotators += ',' + user_id;
        filter.user_id = { $in: annotators.split(',') };
      }
    }

    return (await this.annotations.find(filter)).map(toObject);
  }

  async create({ user_id, groupId, annotation }) {
    return toObject(await this.annotations.create({
      ...annotation,
      user_id,
      group_id: groupId,
      created_at: new Date().toISOString()
    }));
  }

  async read({ user_id, groupId, id }) {
    return toObject(await this.annotations.findOne(
      { user_id, group_id: groupId, _id: id }
    ));
  }

  async getAnnotators({ groupId }) {
    // TODO: in term of user-privacy some may not want to be listed here
    return await this.annotations.find({ group_id: groupId }).distinct('user_id');
  }

  async update({ user_id, groupId, id, annotation }) {
    await this.annotations.updateOne(
      { user_id, group_id: groupId, _id: id },
      { $set: { ...annotation } }
    );
    return this.read({ user_id, groupId, id });
  }

  async delete({ user_id, groupId, id }) {
    await this.annotations.deleteOne(
      { user_id, group_id: groupId, _id: id }
    );
  }
}
