import {
  Body, Controller, Delete, Get, NotFoundException,
  Param, Patch, Post, Query, Req, UseGuards
} from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';

@Controller('annotations')
export class AnnotationsController {

  constructor(
    private service: AnnotationsService,
  ) { }

  private async _getOrFail({ user_id, groupId, id }) {
    const annot = await this.service.read({ user_id, groupId, id });
    if (annot) return useId(annot);
    throw new NotFoundException();
  }

  getUserId(req, user_id) {
    if (req.user) return req.user.id;
    if (user_id?.startsWith('guest:')) return user_id;
    return null;
  }

  @Get(':groupId')
  async list(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Query('annotators') annotators: string,
    @Query('pages') pages: string,
    @Query('user_id') user_id: string,
  ) {
    return (await this.service.list({
      user_id: this.getUserId(req, user_id),
      groupId, pages, annotators
    })).map(useId).map(annot => {
      delete annot.user_id;
      delete annot.group_id;
      return annot;
    });
  }

  @Post(':groupId')
  async post(@Req() req: any, @Param('groupId') groupId: string,
    @Body() annotation: any, @Query('user_id') user_id: string) {
    const annot = useId(await this.service.create({
      user_id: this.getUserId(req, user_id),
      groupId, annotation
    }));
    delete annot.user_id;
    delete annot.group_id;
    return annot;
  }

  // TODO: should this api be authenticated?
  @Get(':groupId/annotators')
  @UseGuards(AuthenticatedGuard)
  async annotators(@Param('groupId') groupId: string) {
    return await this.service.getAnnotators({ groupId });
  }

  @Patch(':groupId/:id')
  async update(@Req() req: any, @Param('groupId') groupId: string,
    @Param('id') id: string, @Body() annotation: any, @Query('user_id') user_id: string) {
    await this._getOrFail({ user_id: this.getUserId(req, user_id), groupId, id });
    const annot = useId(await this.service.update({
      user_id: this.getUserId(req, user_id),
      groupId, id, annotation
    }));
    delete annot.user_id;
    delete annot.group_id;
    return annot;
  }

  @Delete(':groupId/:id')
  async delete(@Req() req: any, @Param('groupId') groupId: string,
    @Param('id') id: string, @Query('user_id') user_id: string) {
    await this._getOrFail({ user_id: this.getUserId(req, user_id), groupId, id });
    await this.service.delete({ user_id: this.getUserId(req, user_id), groupId, id });
  }
}
