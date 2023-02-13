import { StoreModule } from './store/store.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [StoreModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
