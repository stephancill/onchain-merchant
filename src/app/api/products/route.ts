import { promises as fs } from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { getProducts } from "@/lib/saythanks";

interface Product {
  aqId: string;
  network: string;
  category: string;
  validityDays: string;
  validityLabel: string;
  product: string;
  vendorProductId: string;
  vendorProductName: string;
}

async function loadProducts(): Promise<Product[]> {
  const csvPath = path.join(process.cwd(), "src/resources/products.csv");
  const fileContents = await fs.readFile(csvPath, "utf-8");

  const records = parse(fileContents, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map(
    (record: any) =>
      ({
        aqId: record["AQ ID"],
        network: record["Network"],
        category: record["Category"],
        validityDays: record["Validity (days)"],
        validityLabel: record["Validity Label"],
        product: record["Product"],
        vendorProductName: record["ST Product Name"],
        vendorProductId: record["ST Variant ID"],
      } satisfies Product)
  );
}

export async function GET() {
  try {
    const products = await loadProducts();
    const stProducts = await getProducts();

    // Join products with SayThanks variants
    const enrichedProducts = products.map((product) => {
      const stProduct = stProducts.find(
        (variant) => variant.variantId.toString() == product.vendorProductId
      );

      return {
        ...product,
        saythanks: stProduct || null,
        id: stProduct?.id || product.aqId,
      };
    });

    return Response.json({
      products: enrichedProducts,
      stProducts: stProducts,
    });
  } catch (error) {
    console.error("Error loading products:", error);
    return Response.json({ error: "Failed to load products" }, { status: 500 });
  }
}
