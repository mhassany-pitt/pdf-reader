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
    if (annotators == 'all') {
      filter = {
        $and: [
          ...consts,
          { $or: [{ user_id }, { 'misc.visibility': { $ne: 'private' } }] }
        ]
      };
    } else if (annotators == 'mine') {
      filter = { $and: [...consts, { user_id }] };
    } else if (annotators == 'none' || !annotators) {
      filter = { user_id: `[added-to-return-empty]${Math.random()}` };
    } else {
      filter = {
        $and: [
          ...consts,
          { 'misc.displayName': { $in: annotators.split(',') } },
          { $or: [{ user_id }, { 'misc.visibility': { $ne: 'private' } }] }
        ]
      };
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
