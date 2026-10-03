import { describe, expect, it } from "vitest";
import { type ExistingProduct, type ImportLookup, mergeRow, normalizeName, planImport } from "./product-import";

const PHONES = { id: "c1", slug: "mobiles", name_ar: "الموبايلات", name_en: "Mobiles" };
const AUDIO = { id: "c2", slug: "accessories-headphones", name_ar: "إكسسوارات وسماعات", name_en: null };

const existingPhone: ExistingProduct = {
  id: "p1",
  slug: "iphone-15",
  name_ar: "آيفون 15",
  name_en: "iPhone 15",
  category_id: "c1",
  brand_id: "b1",
  price: 3200,
  availability: "in_stock",
  short_description_ar: "قديم",
  short_description_en: null,
  description_ar: null,
  description_en: null,
  search_aliases: ["ايفون"],
  featured: true,
  bestseller_manual: false,
  active: true,
  is_new_override: null,
  sort_order: 3,
};

const lookup: ImportLookup = {
  categories: [PHONES, AUDIO],
  brands: [{ id: "b1", slug: "apple", name: "Apple" }],
  existing: new Map([["iphone-15", existingPhone]]),
};

const header = "slug,name_ar,name_en,category,brand,price,availability";
const plan = (...lines: string[]) => planImport([header, ...lines].map((line) => line.split(",")), lookup);

describe("planImport: new products", () => {
  it("creates a product from a complete row, matching the category by slug or by name", () => {
    const { rows } = plan("galaxy-a55,جالكسي A55,Galaxy A55,mobiles,Samsung,1499,in_stock", ",سماعة,Wired Headset,إكسسوارات وسماعات,,25.5,limited");
    expect(rows[0]).toMatchObject({ kind: "create", slug: "galaxy-a55", errors: [] });
    expect(rows[0].changes).toMatchObject({ category_id: "c1", price: 1499, brand: { create: "Samsung" } });
    // slug made from the English name; category matched by its Arabic name
    expect(rows[1]).toMatchObject({ kind: "create", slug: "wired-headset", errors: [] });
    expect(rows[1].changes).toMatchObject({ category_id: "c2", price: 25.5, availability: "limited" });
  });

  it("reuses an existing brand, ignoring case", () => {
    const { rows } = plan("x-1,اسم,,mobiles,APPLE,10,");
    expect(rows[0].changes.brand).toEqual({ id: "b1" });
  });

  it("reports what is missing or wrong, per column", () => {
    const { rows } = plan(
      "a-1,,A,mobiles,,10,",
      "a-2,اسم,A,,,10,",
      "a-3,اسم,A,phones,,10,",
      "a-4,اسم,A,mobiles,,,",
      "a-5,اسم,A,mobiles,,abc,",
      "a-6,اسم,A,mobiles,,-5,",
      "a-7,اسم,A,mobiles,,10,maybe",
      "Bad Slug,اسم,A,mobiles,,10,",
      ",اسم,,mobiles,,10,",
    );
    const codes = rows.map((row) => row.errors.map((error) => `${error.column}:${error.code}`));
    expect(codes).toEqual([
      ["name_ar:name_required"],
      ["category:category_required"],
      ["category:category_unknown"],
      ["price:price_required"],
      ["price:price_invalid"],
      ["price:price_invalid"],
      ["availability:availability_invalid"],
      ["slug:slug_invalid"],
      ["slug:slug_required"],
    ]);
  });

  it("flags a slug used twice in the file", () => {
    const { rows } = plan("a-1,اسم,A,mobiles,,10,", "a-1,اسم,A,mobiles,,11,");
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toEqual([{ column: "slug", code: "slug_duplicate" }]);
  });

  it("reads Arabic-Indic digits and decimal commas in prices", () => {
    const { rows } = planImport(
      [
        ["slug", "name_ar", "category", "price"],
        ["a-1", "اسم", "mobiles", "٣٢٠٠"],
        ["a-2", "اسم", "mobiles", "١٢٫٥"],
        ["a-3", "اسم", "mobiles", "1,299.50"],
        ["a-4", "اسم", "mobiles", "1299,5"],
      ],
      lookup,
    );
    expect(rows.map((row) => row.changes.price)).toEqual([3200, 12.5, 1299.5, 1299.5]);
  });

  it("understands availability and yes/no words in Arabic and English", () => {
    const { rows } = planImport(
      [
        ["slug", "name_ar", "category", "price", "availability", "featured", "bestseller"],
        ["a-1", "اسم", "mobiles", "1", "متوفر", "نعم", "لا"],
        ["a-2", "اسم", "mobiles", "1", "Out of stock", "yes", "no"],
        ["a-3", "اسم", "mobiles", "1", "كمية محدودة", "TRUE", "0"],
        ["a-4", "اسم", "mobiles", "1", "", "ربما", ""],
      ],
      lookup,
    );
    expect(rows[0].changes).toMatchObject({ availability: "in_stock", featured: true, bestseller_manual: false });
    expect(rows[1].changes).toMatchObject({ availability: "out_of_stock", featured: true, bestseller_manual: false });
    expect(rows[2].changes).toMatchObject({ availability: "limited", featured: true, bestseller_manual: false });
    expect(rows[3].errors).toEqual([{ column: "featured", code: "yes_no_invalid" }]);
  });

  it("splits search aliases on | ; , and Arabic commas", () => {
    const { rows } = planImport(
      [
        ["slug", "name_ar", "category", "price", "search_aliases"],
        ["a-1", "اسم", "mobiles", "1", "ايفون|iphone؛ آيفون, ip"],
      ],
      lookup,
    );
    expect(rows[0].changes.search_aliases).toEqual(["ايفون", "iphone", "آيفون", "ip"]);
  });

  it("rejects text longer than the product form allows", () => {
    const { rows } = planImport([["slug", "name_ar", "category", "price"], ["a-1", "ا".repeat(161), "mobiles", "1"]], lookup);
    expect(rows[0].errors).toEqual([{ column: "name_ar", code: "too_long" }]);
  });
});

describe("planImport: existing products", () => {
  it("updates a known slug and leaves empty cells and absent columns alone", () => {
    const { rows } = planImport([["slug", "price", "name_en"], ["iphone-15", "2999", ""]], lookup);
    expect(rows[0]).toMatchObject({ kind: "update", errors: [] });
    expect(rows[0].changes).toEqual({ price: 2999 });
  });

  it("does not demand the new-product fields on updates", () => {
    const { rows } = planImport([["slug", "availability"], ["iphone-15", "limited"]], lookup);
    expect(rows[0].errors).toEqual([]);
  });

  it("merges the changes into the stored product, keeping visibility, sort order and the rest", () => {
    const { rows } = planImport([["slug", "price", "featured"], ["iphone-15", "2999", "no"]], lookup);
    const saved = mergeRow(rows[0], existingPhone, undefined, "s1");
    expect(saved).toMatchObject({
      id: "p1",
      store_id: "s1",
      price: 2999,
      featured: false,
      name_ar: "آيفون 15",
      brand_id: "b1",
      active: true,
      sort_order: 3,
      search_aliases: ["ايفون"],
      short_description_ar: "قديم",
    });
  });

  it("starts new products hidden, without an id", () => {
    const { rows } = plan("galaxy-a55,جالكسي,Galaxy,mobiles,,1499,");
    const saved = mergeRow(rows[0], undefined, null, "s1");
    expect(saved).not.toHaveProperty("id");
    expect(saved).toMatchObject({ active: false, availability: "in_stock", brand_id: null, sort_order: 0 });
  });
});

describe("planImport: the file itself", () => {
  it("lists unknown columns, missing required ones, and ignores header case and spacing", () => {
    const result = planImport([["Slug", " Name AR ", "Colour"], ["iphone-15", "x", "red"]], lookup);
    expect(result.unknownColumns).toEqual(["Colour"]);
    expect(result.missingRequiredColumns).toEqual(["category", "price"]);
    expect(result.rows[0].changes.name_ar).toBe("x");
  });

  it("numbers rows by their line in the file and caps the size", () => {
    const rows = [["slug", "name_ar", "category", "price"], ...Array.from({ length: 501 }, (_, index) => [`p-${index}`, "x", "mobiles", "1"])];
    const result = planImport(rows, lookup);
    expect(result.rows).toHaveLength(500);
    expect(result.tooManyRows).toBe(true);
    expect(result.rows[0].line).toBe(2);
  });

  it("removes the spreadsheet formula guard from text", () => {
    const { rows } = planImport([["slug", "name_ar", "category", "price"], ["a-1", "'=Pro", "mobiles", "1"]], lookup);
    expect(rows[0].changes.name_ar).toBe("=Pro");
  });
});

describe("normalizeName", () => {
  it("ignores case, spacing, diacritics and look-alike Arabic letters", () => {
    expect(normalizeName("  Mobiles ")).toBe(normalizeName("mobiles"));
    expect(normalizeName("إكسسوارات")).toBe(normalizeName("اكسسوارات"));
    expect(normalizeName("سماعة")).toBe(normalizeName("سماعه"));
    expect(normalizeName("مُتوفِّر")).toBe(normalizeName("متوفر"));
  });
});

describe("export and import fit together", () => {
  it("an exported row imports as an update that changes nothing", async () => {
    const { exportProductRow, IMPORT_COLUMNS } = await import("./product-import");
    const { guardFormula, parseCsv, toCsv } = await import("./csv");
    const product = {
      ...existingPhone,
      name_en: "=Phone, \"15\"",
      search_aliases: ["ايفون", "iphone"],
      categories: { slug: "mobiles" },
      brands: { name: "Apple" },
    };
    const csv = toCsv([[...IMPORT_COLUMNS], exportProductRow(product, guardFormula)]);
    const { rows } = planImport(parseCsv(csv), lookup);

    expect(rows[0]).toMatchObject({ kind: "update", errors: [] });
    const saved = mergeRow(rows[0], existingPhone, rows[0].changes.brand && "id" in rows[0].changes.brand ? rows[0].changes.brand.id : undefined, "s1");
    expect(saved).toMatchObject({
      price: 3200,
      name_en: '=Phone, "15"',
      search_aliases: ["ايفون", "iphone"],
      category_id: "c1",
      brand_id: "b1",
      featured: true,
      availability: "in_stock",
    });
  });
});

describe("brandSlug", () => {
  it("is stable for the same name and works for Arabic names", async () => {
    const { brandSlug } = await import("./product-import");
    expect(brandSlug("Samsung Galaxy")).toBe("samsung-galaxy");
    expect(brandSlug("سامسونج")).toBe(brandSlug(" سامسونج "));
    expect(brandSlug("سامسونج")).toMatch(/^brand-[0-9a-f]+$/);
    expect(brandSlug("سامسونج")).not.toBe(brandSlug("هواوي"));
  });
});
