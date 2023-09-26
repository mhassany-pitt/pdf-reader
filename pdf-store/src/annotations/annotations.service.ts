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
    const consts = [
      { group_id: groupId },
      pages ? { pages: { $in: pages.split(',').map(p => parseInt(p)) } } : null
    ].filter(f => f);

    let filter = null;
    if (!user_id) {
      // client must be authenticated or provide a guest user_id
      filter = { user_id: `[null_user_id_${Math.random()}]` };
    } else if (annotators == 'all') {
      // client's annotations + public annotations
      filter = {
        $and: [
          ...consts,
          { $or: [{ user_id }, { 'misc.visibility': { $ne: 'private' } }] }
        ]
      };
    } else if (annotators == 'mine') {
      // client's annotations
      filter = { $and: [...consts, { user_id }] };
    } else if (annotators == 'none') {
      // no annotations
      filter = { user_id: `[none_user_id_${Math.random()}]` };
    } else if (annotators) {
      // client's annotations + specific annotators's public annotations
      filter = {
        $and: [
          ...consts,
          { 'misc.displayName': { $in: annotators.split(',') } },
          { $or: [{ user_id }, { 'misc.visibility': { $ne: 'private' } }] }
        ]
      };
    } else {
      // client's annotations
      filter = { $and: [...consts, { user_id }] };
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

  async update({ user_id, groupId, id, annotation }) {
    const { user_id: $1, group_id: $2, ...allowed } = annotation;
    await this.annotations.updateOne(
      { user_id, group_id: groupId, _id: id },
      { $set: { ...allowed } }
    );
    return this.read({ user_id, groupId, id });
  }

  async delete({ user_id, groupId, id }) {
    await this.annotations.deleteOne(
      { user_id, group_id: groupId, _id: id }
    );
  }

  async getAnnotators({ groupId }) {
    return await this.annotations.find({
      group_id: groupId
    }).distinct('misc.displayName');
  }
}
