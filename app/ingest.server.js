import prisma from "../db.server";


export async function ingestProducts(shop, url) {
  if (!url) return;
  const text = await (await fetch(url)).text();
  const lines = text.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const obj = JSON.parse(line);

    if (obj.id?.includes("/Product/")) {
      await prisma.product.upsert({
        where: { shopifyId: obj.id },
        create: {
          shopifyId: obj.id,
          shop,
          title: obj.title,
          handle: obj.handle,
          status: obj.status,
          vendor: obj.vendor,
          productType: obj.productType,
        },
        update: {
          title: obj.title,
          handle: obj.handle,
          status: obj.status,
          vendor: obj.vendor,
          productType: obj.productType,
        },
      });
    }

    if (obj.id?.includes("/ProductVariant/")) {
      await prisma.variant.upsert({
        where: { shopifyId: obj.id },
        create: {
          shopifyId: obj.id,
          productShopifyId: obj.__parentId,
          title: obj.title,
          sku: obj.sku,
          price: obj.price,
          compareAtPrice: obj.compareAtPrice,
        },
        update: {
          title: obj.title,
          sku: obj.sku,
          price: obj.price,
          compareAtPrice: obj.compareAtPrice,
        },
      });
    }

    if (obj.id?.includes("/InventoryItem/")) {
      await prisma.inventoryItem.upsert({
        where: { shopifyId: obj.id },
        create: { shopifyId: obj.id, shop, sku: obj.sku, tracked: obj.tracked ?? true },
        update: { sku: obj.sku, tracked: obj.tracked ?? true },
      });
      await prisma.variant.updateMany({
        where: { shopifyId: obj.__parentId },
        data: { inventoryItemId: obj.id },
      });
    }

    if (obj.location?.id) {
      await prisma.location.upsert({
        where: { shopifyId: obj.location.id },
        create: { shopifyId: obj.location.id, shop, name: obj.location.name },
        update: { name: obj.location.name },
      });

      const available =
        obj.quantities?.find((q) => q.name === "available")?.quantity ?? 0;

      await prisma.inventoryLevel.upsert({
        where: {
          inventoryItemId_locationId: {
            inventoryItemId: obj.__parentId,
            locationId: obj.location.id,
          },
        },
        create: {
          inventoryItemId: obj.__parentId,
          locationId: obj.location.id,
          available,
        },
        update: { available },
      });
    }
  }
}

export async function ingestOrders(shop, url) {
  if (!url) return;
  const text = await (await fetch(url)).text();
  const lines = text.trim().split("\n").filter(Boolean);

  const orderMeta = {};
  for (const line of lines) {
    const obj = JSON.parse(line);
    if (obj.id?.includes("/Order/")) {
      orderMeta[obj.id] = {
        createdAt: obj.createdAt,
        financialStatus: obj.displayFinancialStatus,
      };
    }
  }

  for (const line of lines) {
    const obj = JSON.parse(line);
    if (obj.id?.includes("/LineItem/")) {
      const meta = orderMeta[obj.__parentId];
      if (!meta) continue;

      await prisma.orderLineItem.upsert({
        where: { shopifyId: obj.id },
        create: {
          shopifyId: obj.id,
          shop,
          orderShopifyId: obj.__parentId,
          orderCreatedAt: meta.createdAt,
          financialStatus: meta.financialStatus,
          variantShopifyId: obj.variant?.id ?? null,
          quantity: obj.quantity,
        },
        update: {
          financialStatus: meta.financialStatus,
          quantity: obj.quantity,
        },
      });
    }
  }
}
