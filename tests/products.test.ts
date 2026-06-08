import { describe, expect, it } from "vitest";
import { categoryDiscountPercent, filterProducts, getProductPricing, products } from "@/lib/products";

describe("product categories", () => {
  it("filters products by active category", () => {
    expect(filterProducts("core")).toHaveLength(3);
    expect(filterProducts("zero")).toHaveLength(2);
    expect(filterProducts("recovery")).toHaveLength(1);
    expect(filterProducts("limited")).toHaveLength(3);
  });

  it("keeps every product assigned to a visible category", () => {
    const categories = new Set(products.map((product) => product.category));

    expect(categories).toEqual(new Set(["core", "zero", "recovery", "limited"]));
  });

  it("keeps category pricing at the product list values", () => {
    expect(products.map((product) => [product.id, product.priceCents])).toEqual([
      ["pulse-origin", 475],
      ["white-volt-zero", 450],
      ["citrus-drive", 475],
      ["night-session", 525],
      ["recovery-mineral", 495],
      ["cherry-circuit", 475],
      ["glacier-zero", 450],
      ["metro-grape", 525],
      ["matcha-drop", 525]
    ]);
  });

  it("applies the category discount to zero sugar and recovery products", () => {
    expect(categoryDiscountPercent).toBe(10);

    const pricingById = Object.fromEntries(products.map((product) => [product.id, getProductPricing(product)]));

    expect(pricingById["white-volt-zero"]).toMatchObject({
      originalPriceCents: 450,
      salePriceCents: 405,
      originalPrice: "$4.50",
      salePrice: "$4.05",
      isDiscounted: true
    });
    expect(pricingById["glacier-zero"].salePrice).toBe("$4.05");
    expect(pricingById["recovery-mineral"]).toMatchObject({
      originalPriceCents: 495,
      salePriceCents: 446,
      originalPrice: "$4.95",
      salePrice: "$4.46",
      isDiscounted: true
    });
    expect(pricingById["pulse-origin"].isDiscounted).toBe(false);
    expect(pricingById["night-session"].salePriceCents).toBe(525);
  });
});
