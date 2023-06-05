import { Controller, ForbiddenException, Get, Param, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { PDFDocumentTextsService } from './pdf-document-texts.service';
import { useId } from 'src/utils';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Controller('pdf-document-texts')
export class PDFDocumentTextsController {

  constructor(
    private config: ConfigService,
    private service: PDFDocumentTextsService,
    private users: UsersService,
  ) { }

  private async authorize({ apiKey, pdfDocId }) {
    const user = await this.users.findAPIUser(apiKey);
    const permissions: string[] = user?.permissions || [];
    if (!permissions.includes(`pdf-document-texts:${pdfDocId}`))
      throw new UnauthorizedException();
  }

  @Get(':id/:fileId')
  async index(@Req() req: any, @Param('id') pdfDocId: string, @Param('fileId') fileId: string) {
    await this.authorize({ apiKey: req.query.API_KEY, pdfDocId });
    const list = await this.service.list({ pdfDocId, fileId, page: null });
    return list.map(useId);
  }

  @Get(':id/:fileId/:page')
  async get(@Req() req: any, @Param('id') pdfDocId: string, @Param('fileId') fileId: string, @Param('page') page: number) {
    await this.authorize({ apiKey: req.query.API_KEY, pdfDocId });
    const list = await this.service.list({ pdfDocId, fileId, page });
    return list.map(useId);
  }
}
