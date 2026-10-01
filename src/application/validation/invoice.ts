import { z } from "zod";

export const invoiceExtractionSchema = z.object({
  supplierName: z.string().trim().min(1).nullable(),
  invoiceNumber: z.string().trim().min(1).nullable(),
  invoiceDate: z.iso.date().nullable(),
  supplierConfidence: z.number().min(0).max(1).nullable(),
  invoiceNumberConfidence: z.number().min(0).max(1).nullable(),
  invoiceDateConfidence: z.number().min(0).max(1).nullable(),
  items: z.array(
    z.object({
      ingredientName: z.string().trim().min(1),
      quantity: z.number().positive().nullable(),
      unit: z.string().trim().min(1).nullable(),
      unitPrice: z.number().nonnegative().nullable(),
      totalPrice: z.number().nonnegative().nullable(),
      confidence: z.number().min(0).max(1).nullable(),
      sourceText: z.string().trim().min(1).nullable(),
    }),
  ),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
