import prisma from "../db.server";
import { unauthenticated } from "../shopify.server";
import { ingestProducts, ingestOrders } from "./ingest.server";
import { startBulkOperation, ordersQuery } from "./startBulkSync.server";

const STALL_THRESHOLD_MINUTES = 10;

export async function checkStalledBulkJobs() {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - STALL_THRESHOLD_MINUTES);

  const stalled = await prisma.bulkOperationJob.findMany({
    where: { status: "RUNNING", createdAt: { lt: cutoff } },
  });

  for (const job of stalled) {
    const { admin } = await unauthenticated.admin(job.shop);
    const response = await admin.graphql(
      `#graphql
      { currentBulkOperation { id status errorCode url } }`
    );
    const { data } = await response.json();
    const op = data.currentBulkOperation;

    if (op.id !== job.bulkOperationGid || op.status === "RUNNING") {
      continue;
    }

    if (op.status === "COMPLETED") {
      if (job.type === "PRODUCTS") {
        await ingestProducts(job.shop, op.url);
        const since = new Date();
        since.setDate(since.getDate() - 30);
        await startBulkOperation(
          admin,
          job.shop,
          "ORDERS",
          ordersQuery(since.toISOString().split("T")[0])
        );
      } else if (job.type === "ORDERS") {
        await ingestOrders(job.shop, op.url);
        await prisma.shop.upsert({
          where: { shopDomain: job.shop },
          create: { shopDomain: job.shop, initialSyncCompleted: true },
          update: { initialSyncCompleted: true },
        });
      }
      await prisma.bulkOperationJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED" },
      });
    } else {
      // FAILED or CANCELED
      await prisma.bulkOperationJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
    }
  }
}
