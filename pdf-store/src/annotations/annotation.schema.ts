import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnnotationDocument = HydratedDocument<Annotation>;

@Schema()
export class Annotation {
  @Prop() user_id: string;
  @Prop() group_id: string;

  @Prop() type: string;

  // -- highlight, ... 
  @Prop() color: string;
  @Prop({ type: Object }) rects: any;
  @Prop() note: string;

  // -- freeform
  @Prop({ type: Object }) freeforms: any;

  // -- embed
  @Prop() page: number;
  @Prop({ type: Object }) bound: any;
  @Prop() target: string;
  @Prop() targetSize: string;
  @Prop() resource: string;
  @Prop() thumbnail: string;
}

export const AnnotationSchema = SchemaFactory.createForClass(Annotation);