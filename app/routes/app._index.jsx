import { authenticate } from "../shopify.server";
import { syncProducts } from "../services/shopifySync.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const result = await syncProducts(admin);

  return result;
}