import { z } from 'zod';

export const leadInput = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(5000).optional(),
  contactId: z.string().min(1).optional(),
  referredByContactId: z.string().min(1).optional(),
  referredByClientId: z.string().min(1).optional(),
  source: z.enum(['WHATSAPP', 'REFERIDO', 'LINKEDIN', 'VISITA', 'EMAIL_FRIO', 'FORMULARIO', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'OTRO']).default('OTRO'),
}).refine(value => !(value.referredByContactId && value.referredByClientId), {
  message: 'Indica solo un tipo de referente',
});

export const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  dealId: z.string().min(1).optional(),
  contactId: z.string().min(1).optional(),
});

export const paymentReceivedInput = z.object({ id: z.string().min(1) });

export const weeklyVideosInput = z.coerce.number().int().min(1).max(52).default(1);
