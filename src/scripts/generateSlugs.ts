
import slugify from 'slugify';
import { prisma } from '../prisma';

async function generateSlugsForProducts() {
  try {
    const products = await prisma.product.findMany({
      where: { slug: "" },
    });

    for (const product of products) {
      if (!product.name) continue;

      const slug = slugify(product.name, { lower: true, strict: true });

      await prisma.product.update({
        where: { id: product.id },
        data: { slug },
      });

      console.log(`✅ Updated product ${product.id} with slug: ${slug}`);
    }

    console.log(`\n🎉 Finished updating ${products.length} products.`);
  } catch (error) {
    console.error('❌ Error generating slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateSlugsForProducts();
