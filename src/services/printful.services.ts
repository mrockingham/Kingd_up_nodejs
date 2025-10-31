import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import type { Stripe } from 'stripe';

const prisma = new PrismaClient();

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_URL = process.env.PRINTFUL_BASE_URL

const printful = axios.create({
  baseURL: PRINTFUL_URL,
  headers: {
    Authorization: `Bearer ${PRINTFUL_API_KEY}`,
  },
});

export const createPrintfulOrder = async (
  cartId: number,
  shipping: {
    address?: Stripe.Address | null;
    name: string | null;
  },
  email: string,
  customerPhone: string | null
): Promise<any> => {
  
  // 1. Get cart data
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: { variant: true },
      },
    },
  });

  if (!cart) {
    throw new Error(`Cart with ID ${cartId} not found.`);
  }

  // 2. Format cart items for Printful
  const printfulItems = cart.items.map(item => {
    if (!item?.variant?.printfulId) {
      throw new Error(`Missing printfulId for variant ${item?.variant?.id}.`);
    }
    if (!item?.variant?.designFileId) {
    
      throw new Error(`Missing designFileId for variant ${item?.variant?.id}. Please re-sync products.`);
    }

    return {
      variant_id: parseInt(item.variant.printfulId.toString(), 10),
      quantity: item.quantity,
      files: [
        {
         
          id: item.variant.designFileId 
        }
      ]
    };
 
  });

  // 3. Format the Printful request body
  const orderData = {
    recipient: {
      name: shipping.name,
      address1: shipping.address!.line1,
      address2: shipping.address!.line2 || undefined,
      city: shipping.address!.city,
      state_code: shipping.address!.state,
      country_code: shipping.address!.country,
      zip: shipping.address!.postal_code,
      email: email,
      phone: customerPhone || undefined,
    },
    items: printfulItems,
    confirm: true,
  };

  try {
    // 4. Send the order to Printful
    const response = await printful.post('/orders', orderData);
    console.log('✅ Printful order created:', response.data.result.id);
    return response.data.result;
  } catch (error: any) {
    console.error("❌ Printful API Error:", error.response?.data);
    throw new Error('Failed to create Printful order');
  }
};


export const syncPrintfulProducts = async () => {
  try {
    const response = await printful.get('/store/products');
    const products = response.data.result;

    const validPrintfulIds = products.map((p: { id: string | number | bigint | boolean; }) => BigInt(p.id));

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
        const orderableVariantId = variant.variant_id;

       
        const defaultFile = variant.files.find((f: { type: string; }) => f.type === 'default');
        const previewFile = variant.files.find((f: { type: string; }) => f.type === 'preview');
        
        const designFileId = defaultFile?.id;
        
     
        const thumbnailUrl = previewFile?.preview_url || defaultFile?.preview_url || '';

        if (!orderableVariantId) {
          console.warn(`⏭️ Skipping variant with no orderable ID: ${variant.name}`);
          continue;
        }

        await prisma.variant.upsert({
          where: { printfulId: orderableVariantId },
          update: {
            productId: savedProduct.id,
            designFileId: designFileId,
            name: variant.name,
            sku: variant.sku,
            retailPrice: variant.retail_price,
            price,
            thumbnailUrl: thumbnailUrl, 
            size: variant.size,
            color: variant.color,
            availabilityStatus: variant.availability_status,
          },
          create: {
            printfulId: orderableVariantId,
            productId: savedProduct.id,
            designFileId: designFileId, 
            name: variant.name,
            sku: variant.sku,
            retailPrice: variant.retail_price,
            price,
            thumbnailUrl: thumbnailUrl,
            size: variant.size,
            color: variant.color,
            availabilityStatus: variant.availability_status,
          },
        });

        variantCount++;
      }
    }

    const deleteResult = await prisma.product.deleteMany({
      where: {
        printfulId: {
          notIn: validPrintfulIds,
        },
      },
    });

    console.log(`✅ Synced ${productCount} products and ${variantCount} variants`);
    if (deleteResult.count > 0) {
      console.log(`🧹 Cleaned up ${deleteResult.count} stale/deleted products.`);
    }
  } catch (error) {
    console.error('❌ Failed to sync Printful products:', error);
  }
};