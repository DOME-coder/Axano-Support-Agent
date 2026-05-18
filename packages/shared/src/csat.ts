import { z } from 'zod';

// Submitted by the widget when the end user closes the modal after a
// >=30s conversation. The api derives the resolution flip from the
// score (>=4 → resolved, else abandoned) but only if the conversation
// is still `pending`; an already-escalated conversation stays
// escalated even with a low CSAT.

export const csatSubmissionSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
export type CsatSubmission = z.infer<typeof csatSubmissionSchema>;
