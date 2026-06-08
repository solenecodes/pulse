export type ProductCategory = "core" | "zero" | "recovery" | "limited";

export type PulseProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  price: string;
  priceCents: number;
  accent: "blue" | "red" | "green" | "mint" | "amber" | "violet";
  tone: "black" | "silver" | "white" | "charcoal";
  description: string;
  composition: string;
  ingredients: string[];
  drinkWindow: string;
  carbonation: "Sparkling" | "Still";
  recommendation: string;
  image: string;
};

export type ProductPricing = {
  originalPriceCents: number;
  salePriceCents: number;
  originalPrice: string;
  salePrice: string;
  isDiscounted: boolean;
};

export const discountedCategories = new Set<ProductCategory>(["zero", "recovery"]);
export const categoryDiscountPercent = 10;

export const categories: Array<{ id: ProductCategory; label: string }> = [
  { id: "core", label: "Core Line" },
  { id: "zero", label: "Zero Sugar" },
  { id: "recovery", label: "Recovery" },
  { id: "limited", label: "Limited Drops" }
];

export const products: PulseProduct[] = [
  {
    id: "pulse-origin",
    name: "Pulse Origin",
    category: "core",
    categoryLabel: "Core Line",
    price: "$4.75",
    priceCents: 475,
    accent: "blue",
    tone: "black",
    description: "Clean daily energy with a cold electric finish.",
    composition: "120mg caffeine, B vitamins, electrolytes, cane sugar.",
    ingredients: ["Carbonated water", "cane sugar", "natural citrus flavor", "caffeine", "B-vitamin blend", "sea salt"],
    drinkWindow: "Drink 30 minutes before training or 2 hours before a long work block.",
    carbonation: "Sparkling",
    recommendation: "Best served cold before movement, late-morning focus, or a long commute.",
    image: "/assets/isolated-cans/pulse-origin.png"
  },
  {
    id: "white-volt-zero",
    name: "White Volt Zero",
    category: "zero",
    categoryLabel: "Zero Sugar",
    price: "$4.50",
    priceCents: 450,
    accent: "red",
    tone: "silver",
    description: "Bright zero-sugar energy with a sharper edge.",
    composition: "120mg caffeine, B vitamins, electrolytes, zero sugar.",
    ingredients: ["Carbonated water", "natural white citrus flavor", "caffeine", "B-vitamin blend", "sea salt", "stevia leaf extract"],
    drinkWindow: "Drink 30 minutes before effort or 2 hours after lunch for a clean lift.",
    carbonation: "Sparkling",
    recommendation: "Use when you want the Pulse snap without a sweet finish.",
    image: "/assets/isolated-cans/pulse-white-volt-zero.png"
  },
  {
    id: "citrus-drive",
    name: "Citrus Drive",
    category: "core",
    categoryLabel: "Core Line",
    price: "$4.75",
    priceCents: 475,
    accent: "green",
    tone: "black",
    description: "Fresh citrus lift for training and long city days.",
    composition: "140mg caffeine, B vitamins, electrolytes, light cane sugar.",
    ingredients: ["Carbonated water", "cane sugar", "natural lime and grapefruit flavor", "caffeine", "B-vitamin blend", "sea salt"],
    drinkWindow: "Drink 30 minutes before training or 2 hours before an evening session.",
    carbonation: "Sparkling",
    recommendation: "Built for high-tempo days when you need a bright, dry finish.",
    image: "/assets/isolated-cans/pulse-citrus-drive.png"
  },
  {
    id: "night-session",
    name: "Night Session",
    category: "limited",
    categoryLabel: "Limited Drops",
    price: "$5.25",
    priceCents: 525,
    accent: "amber",
    tone: "charcoal",
    description: "Limited evening drop with warm spice and focus.",
    composition: "100mg caffeine, B vitamins, ginger note, low sugar.",
    ingredients: ["Carbonated water", "cane sugar", "natural cola spice flavor", "caffeine", "B-vitamin blend", "ginger extract"],
    drinkWindow: "Drink 2 hours before going out or earlier in the evening.",
    carbonation: "Sparkling",
    recommendation: "A colder, darker profile for nights that still need clarity.",
    image: "/assets/isolated-cans/pulse-night-session.png"
  },
  {
    id: "recovery-mineral",
    name: "Recovery Mineral",
    category: "recovery",
    categoryLabel: "Recovery",
    price: "$4.95",
    priceCents: 495,
    accent: "mint",
    tone: "silver",
    description: "Mineral-led reset for the space after effort.",
    composition: "80mg caffeine, magnesium, sodium, potassium, zero sugar.",
    ingredients: ["Still mineral water", "natural mint and lemon flavor", "caffeine", "magnesium citrate", "sea salt", "potassium citrate"],
    drinkWindow: "Drink 2 hours after training or between demanding blocks.",
    carbonation: "Still",
    recommendation: "Made for the reset after effort, travel, or heat.",
    image: "/assets/isolated-cans/pulse-recovery-mineral.png"
  },
  {
    id: "cherry-circuit",
    name: "Cherry Circuit",
    category: "core",
    categoryLabel: "Core Line",
    price: "$4.75",
    priceCents: 475,
    accent: "red",
    tone: "black",
    description: "Deep cherry energy with a crisp dry finish.",
    composition: "130mg caffeine, B vitamins, electrolytes, cane sugar.",
    ingredients: ["Carbonated water", "cane sugar", "natural cherry flavor", "caffeine", "B-vitamin blend", "sea salt"],
    drinkWindow: "Drink 30 minutes before a session or 2 hours before a late work push.",
    carbonation: "Sparkling",
    recommendation: "For sharper focus with a darker fruit profile.",
    image: "/assets/isolated-cans/pulse-cherry-circuit.png"
  },
  {
    id: "glacier-zero",
    name: "Glacier Zero",
    category: "zero",
    categoryLabel: "Zero Sugar",
    price: "$4.50",
    priceCents: 450,
    accent: "blue",
    tone: "white",
    description: "Cool zero-sugar refresh with a clean mineral snap.",
    composition: "110mg caffeine, B vitamins, electrolytes, zero sugar.",
    ingredients: ["Carbonated water", "natural alpine citrus flavor", "caffeine", "B-vitamin blend", "sea salt", "stevia leaf extract"],
    drinkWindow: "Drink 30 minutes before movement or 2 hours after a heavy meal.",
    carbonation: "Sparkling",
    recommendation: "A cooler profile for light training, travel, and focused resets.",
    image: "/assets/isolated-cans/pulse-glacier-zero.png"
  },
  {
    id: "metro-grape",
    name: "Metro Grape",
    category: "limited",
    categoryLabel: "Limited Drops",
    price: "$5.25",
    priceCents: 525,
    accent: "violet",
    tone: "charcoal",
    description: "Limited grape drop with a polished night profile.",
    composition: "120mg caffeine, B vitamins, grape skin note, low sugar.",
    ingredients: ["Carbonated water", "cane sugar", "natural grape flavor", "caffeine", "B-vitamin blend", "sea salt"],
    drinkWindow: "Drink 2 hours before a night plan or 30 minutes before a creative block.",
    carbonation: "Sparkling",
    recommendation: "Best cold, when the day turns social but still needs focus.",
    image: "/assets/isolated-cans/pulse-metro-grape.png"
  },
  {
    id: "matcha-drop",
    name: "Matcha Drop",
    category: "limited",
    categoryLabel: "Limited Drops",
    price: "$5.25",
    priceCents: 525,
    accent: "green",
    tone: "silver",
    description: "Limited matcha drop with a clean green lift.",
    composition: "110mg caffeine, B vitamins, matcha note, low sugar.",
    ingredients: ["Carbonated water", "cane sugar", "natural matcha flavor", "caffeine", "B-vitamin blend", "sea salt"],
    drinkWindow: "Drink 30 minutes before a focused block or a slow afternoon reset.",
    carbonation: "Sparkling",
    recommendation: "A polished green profile for calm focus and a colder finish.",
    image: "/assets/isolated-cans/pulse-matcha-drop-v2.png"
  }
];

export function filterProducts(category: ProductCategory, list = products) {
  return list.filter((product) => product.category === category);
}

export function formatPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function getDiscountedPriceCents(priceCents: number) {
  return Math.round(priceCents * ((100 - categoryDiscountPercent) / 100));
}

export function getProductPricing(product: Pick<PulseProduct, "category" | "priceCents">): ProductPricing {
  const isDiscounted = discountedCategories.has(product.category);
  const salePriceCents = isDiscounted ? getDiscountedPriceCents(product.priceCents) : product.priceCents;

  return {
    originalPriceCents: product.priceCents,
    salePriceCents,
    originalPrice: formatPrice(product.priceCents),
    salePrice: formatPrice(salePriceCents),
    isDiscounted
  };
}
