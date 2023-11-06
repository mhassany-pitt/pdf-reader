import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PreferenceDocument = HydratedDocument<Preference>;

@Schema()
export class Preference {
  @Prop() user_id: string;

  @Prop() key: string;
  @Prop({ type: Object }) value: any;
}

export const PreferenceSchema = SchemaFactory.createForClass(Preference);