import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const printful = axios.create({
  baseURL: 'https://api.printful.com',
  headers: {
    Authorization: `Bearer ${PRINTFUL_API_KEY}`,
  },
});

export const syncPrintfulProducts = async () => {
  try {
    const response = await printful.get('/store/products');
    const products = response.data.result;

    let productCount = 0;
    let variantCount = 0;

    for (const product of products) {
      const productDetails = await printful.get(`/store/products/${product.id}`);
      const details = productDetails.data.result;

      const productName = details.sync_product?.name;
      const image = details.sync_product?.thumbnail_url || '';

      if (!productName || !details.sync_product?.id) {
        console.warn(`⏭️ Skipping invalid product ${product.id}:`, productName);
        continue;
      }

      const slug = slugify(productName, { lower: true, strict: true });

      const savedProduct = await prisma.product.upsert({
        where: { printfulId: product.id },
        update: {
          name: productName,
          externalId: details.sync_product?.external_id,
          description: details.sync_product?.description || '',
          thumbnailUrl: image,
          slug,
          synced: true,
        },
        create: {
          printfulId: product.id,
          name: productName,
          externalId: details.sync_product?.external_id,
          description: details.sync_product?.description || '',
          thumbnailUrl: image,
          slug,
          synced: true,
        },
      });

      productCount++;

      for (const variant of details.sync_variants) {
        const price = parseFloat(variant.retail_price || '0');

        await prisma.variant.upsert({
          where: { printfulId: variant.id },
          update: {
            productId: savedProduct.id,
            name: variant.name,
            sku: variant.sku,
            retailPrice: variant.retail_price,
            price, // ✅ Store numeric price
            thumbnailUrl: variant.files?.[1]?.preview_url || '',
            size: variant.size,
            color: variant.color,
            availabilityStatus: variant.availability_status,
          },
          create: {
            printfulId: variant.id,
            productId: savedProduct.id,
            name: variant.name,
            sku: variant.sku,
            retailPrice: variant.retail_price,
            price, // ✅ Store numeric price
            thumbnailUrl: variant.files?.[0]?.preview_url || '',
            size: variant.size,
            color: variant.color,
            availabilityStatus: variant.availability_status,
          },
        });

        variantCount++;
      }
    }

    console.log(`✅ Synced ${productCount} products and ${variantCount} variants`);
  } catch (error) {
    console.error('❌ Failed to sync Printful products:', error);
  }
};
