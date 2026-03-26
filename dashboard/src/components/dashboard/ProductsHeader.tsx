import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ProductsHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-foreground">Products</h1>
      <Link href="/dashboard/products/new">
        <Button>Add Product</Button>
      </Link>
    </div>
  );
}
