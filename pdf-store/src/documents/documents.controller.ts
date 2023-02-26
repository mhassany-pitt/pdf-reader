import {
    Body, Controller, Get, NotFoundException, Param,
    Patch, Post, StreamableFile, UploadedFile, UseInterceptors
} from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { createReadStream } from 'fs-extra';

@Controller('documents')
export class DocumentsController {

    constructor(
        private service: DocumentsService,
    ) { }

    @Get()
    index() {
        return this.service.list().map(id => {
            const { name, tags, created_at, modified_at } = this.service.read(id);
            return { id, name, tags, created_at, modified_at };
        });
    }

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    create(@UploadedFile() file: Express.Multer.File) {
        const document = this.service.create(file);
        return document;
    }

    @Get(':id')
    get(@Param('id') id: string) {
        if (!this.service.exists(id))
            throw new NotFoundException();

        return this.service.read(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        if (!this.service.exists(id))
            throw new NotFoundException();

        this.service.write(id, body);
    }

    @Post(':id/file')
    @UseInterceptors(FileInterceptor('file'))
    upload(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
        if (!this.service.exists(id))
            throw new NotFoundException();

        const document = this.service.read(id);
        this.service.upload(document.file_id, file);

        return {};
    }

    @Get(':id/file')
    download(@Param('id') id: string): StreamableFile {
        if (!this.service.exists(id))
            throw new NotFoundException();

        const document = this.service.read(id);

        return new StreamableFile(createReadStream(
            this.service.download(document.file_id, true)
        ));
    }
}