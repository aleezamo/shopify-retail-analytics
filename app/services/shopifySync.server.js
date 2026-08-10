export async function syncProducts(admin) {
  const response = await admin.graphql(`
    query {
      products(first: 50) {
        nodes {
          id
          title
          variants(first: 50) {
            nodes {
              id
              title
              sku
              inventoryItem {
                id
              }
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  return data;
}