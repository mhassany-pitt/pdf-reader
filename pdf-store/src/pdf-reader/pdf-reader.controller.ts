import { Controller, Get, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { PDFReaderService } from './pdf-reader.service';
import { AuthenticatedGuard } from 'src/auth/authenticated.guard';
import { useId } from 'src/utils';
import { createReadStream } from 'fs-extra';

@Controller('pdf-reader')
export class PDFReaderController {

  constructor(
    private service: PDFReaderService,
  ) { }

  @Get(':id')
  @UseGuards(AuthenticatedGuard)
  async get(@Param('id') id: string) {
    return useId(await this.service.read(id));
  }

  @Get(':id/file')
  @UseGuards(AuthenticatedGuard)
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const document = await this.service.read(id);
    return new StreamableFile(createReadStream(
      this.service.download(document.file_id, true)
    ));
  }
}
