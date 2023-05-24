import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PDFDocumentTextDocument = HydratedDocument<PDFDocumentText>;

@Schema()
export class PDFDocumentText {
  @Prop() pdf_doc_id: string;
  @Prop() file_id: string;
  @Prop() page: number;
  @Prop({ type: Object }) texts: [any];
  @Prop() updated_at: string;
}

export const PDFDocumentTextSchema = SchemaFactory.createForClass(PDFDocumentText);