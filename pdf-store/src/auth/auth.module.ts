import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { SessionSerializer } from './session.serializer';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ session: true }),
    MailerModule.forRoot({
      // transport: 'smtps://user@domain.com:pass@smtp.domain.com',
      // defaults: {
      //   from: '"nest-modules" <modules@nestjs.com>',
      // },
      ...{
        transport: {
          host: 'localhost',
          port: 1025,
          ignoreTLS: true,
          secure: false,
          auth: {
            user: process.env.MAILDEV_INCOMING_USER,
            pass: process.env.MAILDEV_INCOMING_PASS,
          },
        },
        defaults: {
          from: '"No Reply" <no-reply@localhost>',
        },
      },
      preview: true,
      template: {
        dir: process.cwd() + '/templates/',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  providers: [AuthService, LocalStrategy, SessionSerializer],
  controllers: [AuthController],
})
export class AuthModule { }
