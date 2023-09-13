import {
  Body, Controller, Get, NotFoundException, Param,
  Patch, Post, Query, Req, UseGuards
} from '@nestjs/common';
import { PDFDocumentLinksService } from './pdf-document-links.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';

@Controller('pdf-document-links')
export class PDFDocumentLinksController {

  constructor(
    private service: PDFDocumentLinksService,
  ) { }

  private async _getOrFail({ user, id }) {
    const pdfLink = await this.service.read({ user, id });
    if (pdfLink)
      return useId(pdfLink);
    throw new NotFoundException();
  }

  @Get()
  @UseGuards(AuthenticatedGuard)
  async index(@Req() req: any, @Query('pdfDocId') pdfDocId: string) {
    const list = await this.service.list({ user: req.user, pdfDocId });
    return list.map(useId);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  async create(@Req() req: any, @Query('pdfDocId') pdfDocId: string, @Body() configs: any) {
    return useId(await this.service.create({ user: req.user, pdfDocId, configs }));
  }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    return this._getOrFail({ user: req.user, id });
  }

  @Patch(':id')
  @UseGuards(AuthenticatedGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() pdfLink: any) {
    await this._getOrFail({ user: req.user, id });
    return useId(await this.service.update({ user: req.user, id, pdfLink }));
  }
}
