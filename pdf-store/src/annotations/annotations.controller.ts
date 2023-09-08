import {
  Body, Controller, Delete, Get, NotFoundException,
  Param, Patch, Post, Query, Req, UseGuards
} from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';
import { UsersService } from 'src/users/users.service';

@Controller('annotations')
export class AnnotationsController {

  constructor(
    private service: AnnotationsService,
    private users: UsersService,
  ) { }

  private async _getOrFail({ user_id, groupId, id }) {
    const pdfLink = await this.service.read({ user_id, groupId, id });
    if (pdfLink)
      return useId(pdfLink);
    throw new NotFoundException();
  }

  getUserId(req, user_id) {
    if (req.user) return req.user.id;
    if (user_id?.startsWith('guest:')) return user_id;
    return null;
  }

  @Get(':groupId')
  @UseGuards(AuthenticatedGuard)
  async list(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Query('annotators') annotators: string,
    @Query('pages') pages: string,
    @Query('user_id') user_id: string,
  ) {
    const annotations = (await this.service.list({
      user_id: this.getUserId(req, user_id),
      groupId, pages, annotators
    })).map(useId);
    const userIds = Array.from(new Set(annotations.map(a => a.user_id)));
    const users = await this.users.getUsers({ userIds });
    const usersInfo = users.reduce(($, user) => ($[user._id] = user, $), {});
    annotations.forEach(annot => {
      const { fullname } = usersInfo[annot.user_id];
      annot.user_fullname = fullname;
    });
    return annotations;
  }

  @Post(':groupId')
  @UseGuards(AuthenticatedGuard)
  async post(@Req() req: any, @Param('groupId') groupId: string,
    @Body() annotation: any, @Query('user_id') user_id: string) {
    return useId(await this.service.create({
      user_id: this.getUserId(req, user_id),
      groupId, annotation
    }));
  }

  @Get(':groupId/annotators')
  @UseGuards(AuthenticatedGuard)
  async annotators(@Req() req: any, @Param('groupId') groupId: string,
    @Query('user_id') user_id: string) {
    const userIds = await this.service.getAnnotators({ groupId });
    const users = await this.users.getUsers({ userIds });
    return users.map(useId)
      .filter(user => user.id != this.getUserId(req, user_id))
      .map(user => ({ id: user.id, fullname: user.fullname }));
  }

  @Patch(':groupId/:id')
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req: any, @Param('groupId') groupId: string,
    @Param('id') id: string, @Body() annotation: any, @Query('user_id') user_id: string) {
    await this._getOrFail({ user_id: this.getUserId(req, user_id), groupId, id });
    return useId(await this.service.update({
      user_id: this.getUserId(req, user_id),
      groupId, id, annotation
    }));
  }

  @Delete(':groupId/:id')
  @UseGuards(AuthenticatedGuard)
  async delete(@Req() req: any, @Param('groupId') groupId: string,
    @Param('id') id: string, @Query('user_id') user_id: string) {
    await this._getOrFail({ user_id: this.getUserId(req, user_id), groupId, id });
    await this.service.delete({ user_id: this.getUserId(req, user_id), groupId, id });
  }
}
