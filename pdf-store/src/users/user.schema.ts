import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop() fullname: string;
  @Prop() email: string;
  @Prop() password: string;
  @Prop() roles: [string];
}

export const UserSchema = SchemaFactory.createForClass(User);