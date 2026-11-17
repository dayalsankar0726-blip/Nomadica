// lib/shopify/client.ts

/**
 * Shopify API version used for every Storefront and Admin request.
 * Shopify supports each version for about 12 months; update this (or the
 * SHOPIFY_API_VERSION setting) at least once a year. Supported versions:
 * https://shopify.dev/docs/api/usage/versioning
 */
export const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION || process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || '2026-10';

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
}

interface ShopifyClientOptions {
  apiVersion?: string;
}

/**
 * Base Shopify GraphQL Client
 */
export class ShopifyClient {
  private shopUrl: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(
    shopUrl: string,
    accessToken: string,
    options: ShopifyClientOptions = {}
  ) {
    this.shopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.accessToken = accessToken;
    this.apiVersion = options.apiVersion || SHOPIFY_API_VERSION;
  }

  protected getEndpoint(api: 'storefront' | 'admin' = 'storefront'): string {
    const pathPrefix = api === 'admin' ? 'admin/' : '';
    const baseUrl = `https://${this.shopUrl}/${pathPrefix}api/${this.apiVersion}`;
    return `${baseUrl}/graphql.json`;
  }

  async request<T = any>(
    query: string,
    variables?: Record<string, any>,
    api: 'storefront' | 'admin' = 'storefront',
    options?: { cache?: RequestCache; next?: { revalidate?: number | false; tags?: string[] } }
  ): Promise<T> {
    const endpoint = this.getEndpoint(api);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Use appropriate header based on API type
    if (api === 'storefront') {
      headers['X-Shopify-Storefront-Access-Token'] = this.accessToken;
    } else {
      headers['X-Shopify-Access-Token'] = this.accessToken;
    }

    const isMutation = query.trim().startsWith('mutation');
    const isCart = query.includes('cart') || query.includes('Cart');
    const isCustomer = query.includes('customer') || query.includes('Customer');

    const fetchOptions: any = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables: variables || {},
      }),
    };

    // Set custom cache or default next revalidate option for read-only storefront requests
    if (options?.cache) {
      fetchOptions.cache = options.cache;
    }
    if (options?.next) {
      fetchOptions.next = options.next;
    } else if (!options?.cache) {
      fetchOptions.cache = 'no-store'; // Always fetch fresh data per user request
    }

    try {
      const response = await fetch(endpoint, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status} ${response.statusText}`
        );
      }

      const data: GraphQLResponse<T> = await response.json();

      if (data.errors && data.errors.length > 0) {
        const errorMessage = data.errors.map((e) => e.message).join(', ');
        throw new Error(`GraphQL Error: ${errorMessage}`);
      }

      return data.data as T;
    } catch (error) {
      console.error('Shopify API request failed:', error);
      throw error;
    }
  }
}

/**
 * Shopify Storefront API Client (public, no auth needed)
 */
export class ShopifyStorefrontClient extends ShopifyClient {
  async request<T = any>(
    query: string,
    variables?: Record<string, any>,
    api: 'storefront' | 'admin' = 'storefront',
    options?: { cache?: RequestCache; next?: { revalidate?: number | false; tags?: string[] } }
  ): Promise<T> {
    return super.request<T>(query, variables, 'storefront', options);
  }
}

/**
 * Shopify Admin API Client (requires authentication)
 */
export class ShopifyAdminClient extends ShopifyClient {
  async request<T = any>(
    query: string,
    variables?: Record<string, any>,
    api: 'storefront' | 'admin' = 'admin',
    options?: { cache?: RequestCache; next?: { revalidate?: number | false; tags?: string[] } }
  ): Promise<T> {
    return super.request<T>(query, variables, 'admin', options);
  }
}
