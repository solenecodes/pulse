import { PulseStorefront } from "@/components/PulseStorefront";
import { categories, products } from "@/lib/products";

export default function Home() {
  return <PulseStorefront categories={categories} products={products} />;
}
