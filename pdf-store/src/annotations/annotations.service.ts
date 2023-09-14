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

    /**/ if (annotators == 'all') { }
    else if (annotators == 'mine') filter.user_id = user_id;
    else if (annotators == 'none') filter.user_id = `[added-to-return-empty]${Math.random()}`;
    else if (annotators) /*     */ filter['misc.displayName'] = { $in: annotators.split(',') };
    else /*                     */ filter.user_id = `[added-to-return-empty]${Math.random()}`;

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
