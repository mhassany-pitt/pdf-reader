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
  const production = (process.env.NODE_ENV || 'development').toLowerCase() == 'production';
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
    store: new (FileStore(session))({ path: config.get('STORAGE_PATH') + '/sessions' }),
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
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

// TODO: enable logging
// TODO: privacy issue with sharing annotations
// TODO: remember who is selected in showing annoations
// TODO: an identifier can be passed to pdf-reader when wrapped in iframe
// TODO: plugin dev environment
// TODO: also load author's annotations
// TODO: add custom message to unauthorized page (in pdf-reader) and possibly to login page
// TODO: change the visibility of my annotations
// TODO: in freehand mode, each stroke is a separate annotation (make the process more simple)
// TODO: if freehand drawings have overlaps they are related, if not, then they are separate
// TODO: add delete button to annotation toolbar
// TODO: presets: color, opacity, thickness
// TODO: add shapes (circle, triangle, square) to freehand drawings
// TODO: add text (which is different from notes)
// TODO: add eraser

// highlight: color, opacity (a 100% opacity is reduct)
// underline, strikethrough: color, opacity, thickness, style (solid, dashed, dotted)
// note: na
// freehand: color, opacity, thickness
// text: font, size, color
// eraser: thickness
// embed: link, icon, target (inline, popup, fullpage, fullscreen)

// add to outline: on highlight
// TODO: adding tags to annotations