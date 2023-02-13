import { Controller, Get, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';

@Controller('store')
export class StoreController {

    @Get('demo.pdf')
    getFile(): StreamableFile {
        return new StreamableFile(createReadStream('./store/demo.pdf'));
    }
}