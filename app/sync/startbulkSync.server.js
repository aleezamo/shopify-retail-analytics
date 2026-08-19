import prisma from "../db.server";
import { unauthenticated } from "../shopify.server";

// Called from afterAuth. Starts the PRODUCTS bulk operation and returns
// immediately - it does NOT wait for completion. The bulk_operations/finish
// webhook picks up from here (see routes/webhooks.bulk-operations.jsx),
// downloads the result, ingests it, then kicks off the ORDERS bulk op,
// and finally marks the shop's initial sync as complete.
export async function startInitialSync(session) {
  const { admin } = await unauthenticated.admin(session.shop);
  await startBulkOperation(admin, session.shop, "PRODUCTS", PRODUCTS_QUERY);
}

export const PRODUCTS_QUERY = `
  {
    products {
      edges {
        node {
          id
          title
          handle
          status
          vendor
          productType
          variants {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryItem {
                  id
                  tracked
                  sku
                  inventoryLevels {
                    edges {
                      node {
                        location { id name }
                        quantities(names: ["available"]) {
                          name
                          quantity
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const ordersQuery = (since) => `
  {
    orders(query: "created_at:>='${since}'") {
      edges {
        node {
          id
          createdAt
          displayFinancialStatus
          lineItems {
            edges {
              node {
                id
                quantity
                variant { id }
              }
            }
          }
        }
      }
    }
  }
`;

export async function startBulkOperation(admin, shop, type, query) {
  const response = await admin.graphql(
    `#graphql
    mutation {
      bulkOperationRunQuery(query: """${query}""") {
        bulkOperation { id status }
        userErrors { field message }
      }
    }`
  );
  const { data } = await response.json();
  if (data.bulkOperationRunQuery.userErrors.length) {
    throw new Error(JSON.stringify(data.bulkOperationRunQuery.userErrors));
  }

  const bulkOperationGid = data.bulkOperationRunQuery.bulkOperation.id;

  await prisma.bulkOperationJob.create({
    data: { shop, type, bulkOperationGid, status: "RUNNING" },
  });

  return bulkOperationGid;
}