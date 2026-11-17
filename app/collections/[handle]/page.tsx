/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionByHandle } from "@/lib/shopify/products";
import { constructMetadata } from "@/lib/seo/metadata";
import { getCollectionSchema } from "@/lib/schema/collection";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import CollectionClient from "@/components/shop/CollectionClient";
import { PageLoader } from "@/components/ui/PageLoader";
import { mapProductNode } from "@/lib/products/listing";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getCollectionByHandle(handle);

  if (!collection) {
    return constructMetadata({
      title: "Collection Not Found - Nomadica",
      description: "The requested collection could not be found.",
      path: `/collections/${handle}`,
    });
  }

  const title = `${collection.title} - Nomadica`;
  const description = collection.description || `Browse the latest ${collection.title} at Nomadica. Premium travel-inspired apparel.`;
  const image = collection.image?.url || "/opengraph-image.jpg";

  return constructMetadata({
    title,
    description,
    path: `/collections/${handle}`,
    ogImage: image,
  });
}

export default async function CollectionPage({ params }: PageProps) {
  const { handle } = await params;
  const collection = await getCollectionByHandle(handle, 24);

  if (!collection) {
    notFound();
  }

  const edges = collection.products?.edges || [];
  const nodes = edges.map((edge: any) => edge.node);
  const mappedProducts = nodes.map((node: any) => mapProductNode(node, [collection.title, handle]));

  const collectionSchema = getCollectionSchema(collection, mappedProducts);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: collection.title, path: `/collections/${handle}` },
  ]);

  return (
    <>
      <JsonLd schema={collectionSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <Suspense fallback={<PageLoader />}>
        <CollectionClient
          source="collection"
          collectionHandle={handle}
          title={collection.title}
          eyebrow="Collection"
          initialNodes={nodes}
          initialPageInfo={collection.products?.pageInfo}
        />
      </Suspense>
    </>
  );
}
