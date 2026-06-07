import { NextResponse } from "next/server";
import type { CartItem, Product } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getProductPricing, products } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { cartItemSchema } from "@/lib/schemas";

const productsById = new Map(products.map((product) => [product.id, product]));
type CartItemWithProduct = CartItem & { product: Product };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });

  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({
    items: (items as CartItemWithProduct[]).map((item) => {
      const storefrontProduct = productsById.get(item.product.id);
      if (!storefrontProduct) return item;

      const pricing = getProductPricing(storefrontProduct);

      return {
        ...item,
        product: {
          ...item.product,
          category: storefrontProduct.category,
          originalPriceCents: pricing.originalPriceCents,
          priceCents: pricing.salePriceCents
        }
      };
    })
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = cartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
  }

  const item = await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: user.id,
        productId: parsed.data.productId
      }
    },
    create: {
      userId: user.id,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity
    },
    update: {
      quantity: { increment: parsed.data.quantity }
    }
  });

  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = cartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
  }

  const item = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: user.id,
        productId: parsed.data.productId
      }
    }
  });

  if (!item) {
    return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
  }

  const updatedItem = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: parsed.data.quantity }
  });

  return NextResponse.json({ item: updatedItem });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
  }

  await prisma.cartItem.deleteMany({
    where: {
      userId: user.id,
      productId
    }
  });

  return NextResponse.json({ ok: true });
}
