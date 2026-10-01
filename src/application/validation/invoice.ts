import { z } from "zod";

export const invoiceExtractionSchema = z.object({
  supplierName: z.string().trim().min(1).nullable(),
  invoiceNumber: z.string().trim().min(1).nullable(),
  invoiceDate: z.iso.date().nullable(),
  items: z.array(
    z.object({
      ingredientName: z.string().trim().min(1),
      quantity: z.number().positive().nullable(),
      unit: z.string().trim().min(1).nullable(),
      unitPrice: z.number().nonnegative().nullable(),
    }),
  ),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
