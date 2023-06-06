export type PDFDocumentLink = {
  id: string,
  title: string,
  delegated: boolean,
  delegated_to_url: string,
  published: string,
  archived: boolean,
  created_at: string,
  // --- features
  log_interactions: boolean,
  highlight: boolean,
  underline: boolean,
  linethrough: boolean,
  redact: boolean,
  notes: boolean,
  freeform: boolean,
  embed_resource: boolean,
  // --- interaction logger
  document_events: string,
  pdfjs_events: string,
  mousemove_log_delay: number,
  scroll_log_delay: number,
  resize_log_delay: number,
  // --- annotation
  annotation_colors: string,
  // --- freeform
  freeform_stroke_sizes: string,
  freeform_colors: string,
  // --- advanced features (apis)
  annotation_api: string,
  interaction_logger_api: string,
  // --- 
  authorized_accounts: string,
  custom_plugins: string,
};