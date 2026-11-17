// lib/shopify/queries.ts

/**
 * GraphQL Queries and Mutations for Shopify APIs
 */

// ---- Shared product fields ----

const METAOBJECT_REFERENCE = `
  id
  value
  reference {
    ... on Metaobject {
      id
      handle
      type
      fields {
        key
        value
        reference {
          ... on MediaImage {
            image {
              url
            }
          }
          ... on GenericFile {
            url
          }
        }
      }
    }
  }
`;

/**
 * Fields every product card and listing needs. `badgeField` is the optional
 * custom.badge metafield: a badge shows only when the store sets one.
 */
const PRODUCT_CARD_FIELDS = `
  id
  title
  description
  handle
  createdAt
  productType
  productTypeConfig: metafield(namespace: "custom", key: "product_type_configuration") {
    ${METAOBJECT_REFERENCE}
  }
  metafieldProductType: metafield(namespace: "custom", key: "product_type") {
    ${METAOBJECT_REFERENCE}
  }
  badgeField: metafield(namespace: "custom", key: "badge") {
    value
  }
  tags
  options {
    name
    values
  }
  collections(first: 10) {
    edges {
      node {
        title
        handle
      }
    }
  }
  images(first: 5) {
    edges {
      node {
        url
        altText
      }
    }
  }
  variants(first: 25) {
    edges {
      node {
        id
        title
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        available: availableForSale
      }
    }
  }
`;

/**
 * Product page fields: the card fields plus the description (as HTML) and the optional
 * custom.materials / custom.care_instructions metafields. Metafields the store hasn't
 * created simply come back null.
 */
const PRODUCT_DETAIL_FIELDS = `
  id
  title
  description
  descriptionHtml
  handle
  createdAt
  productType
  productTypeConfig: metafield(namespace: "custom", key: "product_type_configuration") {
    ${METAOBJECT_REFERENCE}
  }
  metafieldProductType: metafield(namespace: "custom", key: "product_type") {
    ${METAOBJECT_REFERENCE}
  }
  badgeField: metafield(namespace: "custom", key: "badge") {
    value
  }
  materialsField: metafield(namespace: "custom", key: "materials") {
    value
  }
  careField: metafield(namespace: "custom", key: "care_instructions") {
    value
  }
  tags
  options {
    name
    values
  }
  collections(first: 5) {
    edges {
      node {
        title
        handle
      }
    }
  }
  images(first: 20) {
    edges {
      node {
        url
        altText
      }
    }
  }
  variants(first: 100) {
    edges {
      node {
        id
        title
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        available: availableForSale
      }
    }
  }
`;

// ============ STOREFRONT API QUERIES ============

export const STOREFRONT_QUERIES = {
  // Products
  //
  // List queries accept an optional sort and cursor so listings can load more pages
  // ("Load more") and sort on the server. Unset variables fall back to Shopify's defaults.
  GET_PRODUCTS: `
    query GetProducts($first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            ${PRODUCT_CARD_FIELDS}
          }
        }
      }
    }
  `,

  GET_PRODUCT_BY_HANDLE: `
    query GetProductByHandle($handle: String!) {
      # Aliased so callers keep reading data.productByHandle (productByHandle is deprecated).
      productByHandle: product(handle: $handle) {
        ${PRODUCT_DETAIL_FIELDS}
      }
    }
  `,

  /** Only the handle, for redirecting old /shop/product-details?id= links. */
  GET_PRODUCT_HANDLE_BY_ID: `
    query GetProductHandleById($id: ID!) {
      product(id: $id) {
        handle
      }
    }
  `,

  /** Shopify's own "related products" for the product page. */
  GET_PRODUCT_RECOMMENDATIONS: `
    query GetProductRecommendations($productId: ID!) {
      productRecommendations(productId: $productId, intent: RELATED) {
        ${PRODUCT_CARD_FIELDS}
      }
    }
  `,
  SEARCH_PRODUCTS: `
    query SearchProducts($query: String!, $first: Int!) {
      search(first: $first, query: $query, types: PRODUCT) {
        edges {
          node {
            ... on Product {
              id
              title
              handle
              productType
              productTypeConfig: metafield(namespace: "custom", key: "product_type_configuration") {
                id
                value
                reference {
                  ... on Metaobject {
                    id
                    handle
                    type
                    fields {
                      key
                      value
                      reference {
                        ... on MediaImage {
                          image {
                            url
                          }
                        }
                        ... on GenericFile {
                          url
                        }
                      }
                    }
                  }
                }
              }
              metafieldProductType: metafield(namespace: "custom", key: "product_type") {
                id
                value
                reference {
                  ... on Metaobject {
                    id
                    handle
                    type
                    fields {
                      key
                      value
                      reference {
                        ... on MediaImage {
                          image {
                            url
                          }
                        }
                        ... on GenericFile {
                          url
                        }
                      }
                    }
                  }
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  // Collections
  GET_COLLECTIONS: `
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            image {
              url
            }
            products(first: 50) {
              edges {
                node {
                  id
                  handle
                }
              }
            }
          }
        }
      }
    }
  `,

  GET_COLLECTION_BY_HANDLE: `
    query GetCollectionByHandle($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
      # Aliased so callers keep reading data.collectionByHandle (collectionByHandle is deprecated).
      collectionByHandle: collection(handle: $handle) {
        id
        title
        handle
        description
        image {
          url
        }
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              ${PRODUCT_CARD_FIELDS}
            }
          }
        }
      }
    }
  `,
  // Cart
  CREATE_CART: `
    mutation CreateCart($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      id
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  GET_CART: `
    query GetCart($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        discountCodes {
          code
          applicable
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product {
                    id
                    title
                    images(first: 1) {
                      edges {
                        node {
                          url
                        }
                      }
                    }
                  }
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
      }
    }
  `,

  UPDATE_CART_DISCOUNT_CODES: `
    mutation UpdateCartDiscountCodes($cartId: ID!, $discountCodes: [String!]!) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart {
          id
          discountCodes {
            code
            applicable
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  UPDATE_CART: `
    mutation UpdateCart($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      id
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  UPDATE_CART_QUANTITY: `
    mutation UpdateCartQuantity($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      id
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  REMOVE_CART_LINES: `
    mutation RemoveCartLines($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      id
                      title
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  GET_PRODUCT_TYPE_MOCKUPS: `
    query GetProductTypeConfigurations {
      metaobjects(type: "product_type_configuration", first: 50) {
        nodes {
          id
          handle
          fields {
            key
            value
            reference {
              ... on MediaImage {
                image {
                  url
                }
              }
              ... on GenericFile {
                url
              }
            }
          }
        }
      }
    }
  `,
};

// Admin API queries live next to the server code that uses them
// (lib/checkout/orders.ts, app/api/orders/track/route.ts), using lib/shopify/admin.ts.
