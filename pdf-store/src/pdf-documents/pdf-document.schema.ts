import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PDFDocumentDocument = HydratedDocument<PDFDocument>;

@Schema()
export class PDFDocument {
  @Prop() owner_id: string;
  @Prop() title: string;
  @Prop() tags: [string];
  @Prop() file_id: string;
  @Prop() sections: [any];
  @Prop() created_at: string;
  @Prop() modified_at: string;
}

export const PDFDocumentSchema = SchemaFactory.createForClass(PDFDocument);