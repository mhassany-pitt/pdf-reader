import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PDFDocumentLinkDocument = HydratedDocument<PDFDocumentLink>;

@Schema()
export class PDFDocumentLink {
  @Prop() user_id: string;
  @Prop() pdf_doc_id: string;

  @Prop() archived: boolean;
  @Prop() published: boolean;
  @Prop() delegated: boolean;
  @Prop() delegated_to_url: string;
  @Prop() title: string;
  @Prop({ type: Object }) configs: any;
  @Prop() created_at: string;
}

export const PDFDocumentLinkSchema = SchemaFactory.createForClass(PDFDocumentLink);