import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AnnotationDocument = HydratedDocument<Annotation>;

@Schema()
export class Annotation {
  @Prop() user_id: string;
  @Prop() group_id: string;

  @Prop() type: string;
  @Prop() pages: number[];

  // -- highlight, ... 
  @Prop() color: string;
  @Prop() stroke: string;
  @Prop() strokeStyle: string;
  @Prop({ type: Object }) rects: any;
  @Prop() note: string;

  // -- freeform
  @Prop({ type: Object }) freeforms: any;

  // -- embed
  @Prop() target: string;
  @Prop() targetSize: string;
  @Prop() resource: string;
  @Prop() thumbnail: string;

  // -- misc
  @Prop({ type: Object }) misc: any;
}

export const AnnotationSchema = SchemaFactory.createForClass(Annotation);