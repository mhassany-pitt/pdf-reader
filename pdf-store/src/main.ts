import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as session from 'express-session';
import * as FileStore from 'session-file-store';
import * as passport from 'passport';
import * as bodyParser from 'body-parser';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const production = (await config.get('PRODUCTION') || '').toLowerCase() == 'true';
  if (!production) {
    app.enableCors({ credentials: true, origin: 'http://localhost:4200' });
  }

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.use(session({
    secret: config.get('SESSION_SECRET'),
    resave: true,
    saveUninitialized: true,
    name: 'pdf-reader-session',
    store: production ? new session.MemoryStore()
      : new (FileStore(session))({ path: config.get('STORAGE') + '/app/sessions' }),
    cookie: {
      secure: false,
      maxAge: 3600000 // 1hr
    }
  }))
  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen((await config.get('PORT')) || 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
