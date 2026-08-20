import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),

  hooks: {
    afterAuth: async ({ session }) => {
      // Register webhooks for this shop
      console.log("// Register webhooks for this shop");
      await shopify.registerWebhooks({ session });
 
      // Check if we've already done the initial full sync for this shop
      const existing = await prisma.shop.findUnique({
        where: { shopDomain: session.shop },
      });
 
      if (!existing || !existing.initialSyncCompleted) {
          console.log("!existing or !existing.initialSyncCompleted");
        // Fire and forget - kicks off the PRODUCTS bulk operation and
        // returns immediately. The bulk_operations/finish webhook
        // (routes/webhooks.bulk-operations.jsx) picks up from there,
        // chains into the ORDERS bulk op, and marks completion.
        startInitialSync(session).catch((err) => {
          console.error(`Failed to start initial sync for ${session.shop}:`, err);
        });
 
        
        await prisma.shop.upsert({
          where: { shopDomain: session.shop },
          create: { shopDomain: session.shop, initialSyncCompleted: false },
          update: {},
        });
      }
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.July26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
