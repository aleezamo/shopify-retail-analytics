import prisma from "../../db.server";

// Simplest option: store the notification in our own DB, then render it
// in the app's UI (a banner, a notifications list/bell icon, etc).
// No external service (email/Slack) required to start.
export async function notifyMerchant(shop, { type, message }) {
  await prisma.notification.create({
    data: { shop, type, message },
  });
}
