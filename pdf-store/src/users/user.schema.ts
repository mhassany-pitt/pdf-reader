import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop() userType: string;
  @Prop() apiKey: string;
  @Prop() fullname: string;
  @Prop() email: string;
  @Prop() password: string;
  @Prop() roles: [string];
  @Prop() permissions: [string];
}

export const UserSchema = SchemaFactory.createForClass(User);