import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PDFDocumentLinkDocument = HydratedDocument<PDFDocumentLink>;

@Schema()
export class PDFDocumentLink {
  @Prop() owner_id: string;
  @Prop() pdf_doc_id: string;

  @Prop() title: string;
  @Prop() published: boolean;
  @Prop() created_at: string;
  // --- features
  @Prop() log_interactions: boolean;
  @Prop() highlight: boolean;
  @Prop() underline: boolean;
  @Prop() linethrough: boolean;
  @Prop() redact: boolean;
  @Prop() notes: boolean;
  @Prop() freeform: boolean;
  @Prop() embed_resource: boolean;
  // --- interaction logger
  @Prop() document_events: [string];
  @Prop() pdfjs_events: [string];
  @Prop() mousemove_log_delay: number;
  @Prop() scroll_log_delay: number;
  @Prop() resize_log_delay: number;
  // --- annotation
  @Prop() annotation_colors: string;
  // --- freeform
  @Prop() freeform_stroke_sizes: string;
  @Prop() freeform_colors: string;
  // --- advanced features (apis)
  @Prop() annotation_api: string;
  @Prop() interaction_logger_api: string;
}

export const PDFDocumentLinkSchema = SchemaFactory.createForClass(PDFDocumentLink);