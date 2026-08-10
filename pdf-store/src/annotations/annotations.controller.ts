import {
  BadRequestException, Body, Controller, Delete, Get, NotFoundException,
  Param, Patch, Post, Query, Req
} from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
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

  /** Mutations require an authenticated session or an explicit guest id. */
  private requireUserId(req, user_id: string) {
    const resolved = this.getUserId(req, user_id);
    if (!resolved) {
      throw new BadRequestException('user_id is required (authenticated session or guest:…)');
    }
    return resolved;
  }

  /** Strip ownership fields and expose whether the caller can mutate this annotation. */
  private toClient(annot: any, user_id: string | null) {
    if (!annot) return annot;
    const out = useId(annot);
    const isMine = !!user_id && out.user_id === user_id;
    delete out.user_id;
    delete out.group_id;
    return { ...out, isMine };
  }

  @Get(':groupId')
  async list(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Query('annotators') annotators: string,
    @Query('pages') pages: string,
    @Query('user_id') user_id: string,
  ) {
    const resolvedUserId = this.getUserId(req, user_id);
    return (await this.service.list({
      user_id: resolvedUserId,
      groupId, pages, annotators
    })).map(annot => this.toClient(annot, resolvedUserId));
  }

  @Post(':groupId')
  async post(@Req() req: any, @Param('groupId') groupId: string,
    @Body() annotation: any, @Query('user_id') user_id: string) {
    const resolvedUserId = this.requireUserId(req, user_id);
    return this.toClient(await this.service.create({
      user_id: resolvedUserId,
      groupId, annotation
    }), resolvedUserId);
  }

  @Get(':groupId/annotators')
  async annotators(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Query('user_id') user_id: string,
  ) {
    return (await this.service.getAnnotators({
      groupId,
      user_id: this.getUserId(req, user_id),
    })).map(a => a?.trim()).filter(a => a);
  }

  @Patch(':groupId/:id')
  async update(@Req() req: any, @Param('groupId') groupId: string,
    @Param('id') id: string, @Body() annotation: any, @Query('user_id') user_id: string) {
    const resolvedUserId = this.requireUserId(req, user_id);
    await this._getOrFail({ user_id: resolvedUserId, groupId, id });
    return this.toClient(await this.service.update({
      user_id: resolvedUserId,
      groupId, id, annotation
    }), resolvedUserId);
  }

  @Delete(':groupId/:id')
  async delete(@Req() req: any, @Param('groupId') groupId: string,
    @Param('id') id: string, @Query('user_id') user_id: string) {
    const resolvedUserId = this.requireUserId(req, user_id);
    await this._getOrFail({ user_id: resolvedUserId, groupId, id });
    await this.service.delete({ user_id: resolvedUserId, groupId, id });
  }
}
