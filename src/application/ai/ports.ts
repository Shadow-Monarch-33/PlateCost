import type { z } from "zod";

export type ExtractionSource = {
  fileName: string;
  mimeType: string;
  content: Uint8Array;
};

export type ExtractionResult<T> = {
  data: T;
  source: "ai";
  confidence?: number;
};

export interface InvoiceExtractor<TSchema extends z.ZodType> {
  extractInvoice(
    source: ExtractionSource,
    schema: TSchema,
  ): Promise<ExtractionResult<z.output<TSchema>>>;
}

export interface RecipeExtractor<TSchema extends z.ZodType> {
  extractRecipe(
    source: ExtractionSource,
    schema: TSchema,
  ): Promise<ExtractionResult<z.output<TSchema>>>;
}
