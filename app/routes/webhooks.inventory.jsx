import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { notifyMerchant } from "../notifications.server";

const LOW_STOCK_THRESHOLD = 5; 

export const action = async ({ request }) => {
  const { shop, payload } = await authenticate.webhook(request);
  const inventoryItemGid = `gid://shopify/InventoryItem/${payload.inventory_item_id}`;
  const locationGid = `gid://shopify/Location/${payload.location_id}`;

  const level = await prisma.inventoryLevel.upsert({
    where: {
      inventoryItemId_locationId: {
        inventoryItemId: inventoryItemGid,
        locationId: locationGid,
      },
    },
    create: {
      inventoryItemId: inventoryItemGid,
      locationId: locationGid,
      available: payload.available,
    },
    update: { available: payload.available },
  });

  if (payload.available === 0) {
    await alertMerchant(shop, inventoryItemGid, "OUT_OF_STOCK", payload.available);
  } else if (payload.available <= LOW_STOCK_THRESHOLD) {
    await alertMerchant(shop, inventoryItemGid, "LOW_STOCK", payload.available);
  }

  return new Response(null, { status: 200 });
};

async function alertMerchant(shop, inventoryItemGid, type, available) {
  const item = await prisma.inventoryItem.findUnique({
    where: { shopifyId: inventoryItemGid },
    include: { variant: { include: { product: true } } },
  });

  const label = item?.variant
    ? `${item.variant.product.title} - ${item.variant.title}`
    : inventoryItemGid;

  await notifyMerchant(shop, {
    type,
    message:
      type === "OUT_OF_STOCK"
        ? `${label} is now out of stock.`
        : `${label} is low on stock (${available} remaining).`,
  });
}
