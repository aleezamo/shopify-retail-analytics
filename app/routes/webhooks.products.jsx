import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  switch (topic) {
    case "PRODUCTS_CREATE":
    case "PRODUCTS_UPDATE":
      await prisma.product.upsert({
        where: { shopifyId: `gid://shopify/Product/${payload.id}` },
        create: {
          shopifyId: `gid://shopify/Product/${payload.id}`,
          shop,
          title: payload.title,
        },
        update: { title: payload.title },
      });
      break;

    case "PRODUCTS_DELETE":
      await prisma.product.deleteMany({
        where: { shopifyId: `gid://shopify/Product/${payload.id}` },
      });
      break;
  }

  return new Response(null, { status: 200 });
};
