import { prisma } from "@/src/lib/db";

export type NotificationType = "NEW_EMAIL" | "NEW_CONTACT" | "NEW_FORM_LEAD";

interface CreateNotificationParams {
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  entityId?: string;
}

/**
 * Fire-and-forget notification creator. Call without await in API routes
 * to avoid blocking the response.
 */
export function createNotification(params: CreateNotificationParams): void {
  prisma.notification
    .create({
      data: {
        organizationId: params.organizationId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
        entityId: params.entityId,
      },
    })
    .catch((err) => console.error("createNotification error:", err));
}
