import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  const orderGid = `gid://shopify/Order/${payload.id}`;
  const financialStatus = payload.financial_status?.toUpperCase() ?? null;

  switch (topic) {
    case "ORDERS_CREATE":
      for (const item of payload.line_items ?? []) {
        await prisma.orderLineItem.upsert({
          where: { shopifyId: `gid://shopify/LineItem/${item.id}` },
          create: {
            shopifyId: `gid://shopify/LineItem/${item.id}`,
            shop,
            orderShopifyId: orderGid,
            orderCreatedAt: new Date(payload.created_at),
            financialStatus,
            variantShopifyId: item.variant_id
              ? `gid://shopify/ProductVariant/${item.variant_id}`
              : null,
            quantity: item.quantity,
          },
          update: {
            financialStatus,
            quantity: item.quantity,
          },
        });
      }
      break;

    case "ORDERS_UPDATED":
    case "ORDERS_CANCELLED":

      await prisma.orderLineItem.updateMany({
        where: { orderShopifyId: orderGid },
        data: { financialStatus },
      });
      break;
  }

  return new Response(null, { status: 200 });
};
