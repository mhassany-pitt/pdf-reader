import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';

@Controller('annotations')
export class AnnotationsController {

  constructor(private service: AnnotationsService) { }

  private async _getOrFail({ user, groupId, id }) {
    const pdfLink = await this.service.read({ user, groupId, id });
    if (pdfLink)
      return useId(pdfLink);
    throw new NotFoundException();
  }

  @Get(':groupId')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: any, @Param('groupId') groupId: string) {
    return (await this.service.list({ user: req.user, groupId })).map(useId);
  }

  @Post(':groupId')
  @UseGuards(AuthenticatedGuard)
  async post(@Req() req: any, @Param('groupId') groupId: string, @Body() annotation: any) {
    return useId(await this.service.create({ user: req.user, groupId, annotation }));
  }

  @Patch(':groupId/:id')
  @UseGuards(AuthenticatedGuard)
  async patch(@Req() req: any, @Param('groupId') groupId: string, @Param('id') id: string, @Body() annotation: any) {
    await this._getOrFail({ user: req.user, groupId, id });
    return useId(await this.service.update({ user: req.user, groupId, id, annotation }));
  }

  @Delete(':groupId/:id')
  @UseGuards(AuthenticatedGuard)
  async delete(@Req() req: any, @Param('groupId') groupId: string, @Param('id') id: string) {
    await this._getOrFail({ user: req.user, groupId, id });
    await this.service.delete({ user: req.user, groupId, id });
  }
}
