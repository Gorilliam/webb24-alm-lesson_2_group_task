const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Product = require("../../models/Product");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe("Product Model Test Suite", () => {
  const validProductData = {
    name: "Test Product",
    price: 99.99,
    description: "Test Description",
    category: "Electronics", // Added category for validation
  };

  describe("Validation Tests", () => {
    test("should validate a valid product with category", async () => {
      const validProduct = new Product(validProductData);
      const savedProduct = await validProduct.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe(validProductData.name);
      expect(savedProduct.price).toBe(99.99);
      expect(savedProduct.description).toBe(validProductData.description);
      expect(savedProduct.category).toBe(validProductData.category); // Test category
    });

    test("should fail validation when category is missing", async () => {
      const productWithoutCategory = new Product({
        name: "Test Product",
        price: 99.99,
        description: "Test Description",
      });

      let err;
      try {
        await productWithoutCategory.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.category).toBeDefined(); // Expect category error
    });

    test("should fail validation when category is empty", async () => {
      const productWithEmptyCategory = new Product({
        name: "Test Product",
        price: 99.99,
        description: "Test Description",
        category: "", // Empty category
      });

      let err;
      try {
        await productWithEmptyCategory.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.category).toBeDefined(); // Expect category error for empty category
    });
  });

  describe("CRUD Operation Tests", () => {
    test("should create & save product with category successfully", async () => {
      const validProduct = new Product(validProductData);
      const savedProduct = await validProduct.save();

      const foundProduct = await Product.findById(savedProduct._id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct.category).toBe(validProductData.category); // Test category field
    });

    test("should update product's category successfully", async () => {
      const product = new Product(validProductData);
      await product.save();

      const updatedCategory = "Home Appliances"; // New category
      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        { category: updatedCategory },
        { new: true }
      );

      expect(updatedProduct.category).toBe(updatedCategory); // Ensure category is updated
    });

    test("should fail to update product if category is empty", async () => {
      const product = new Product(validProductData);
      await product.save();

      expect(
         Product.findByIdAndUpdate(
          product._id,
          { category: "" }, // Empty category
          { new: true, runValidators: true }
        )
      ).rejects.toThrow();

    });
  });

  describe("Timestamp Tests", () => {
    test("should have createdAt and updatedAt timestamps", async () => {
      const product = new Product(validProductData);
      const savedProduct = await product.save();

      expect(savedProduct.createdAt).toBeDefined();
      expect(savedProduct.updatedAt).toBeDefined();

      const originalUpdatedAt = savedProduct.updatedAt;
      const updatedProduct = await Product.findByIdAndUpdate(savedProduct._id, { price: 199.99 },{new: true});
      expect(updatedProduct.updatedAt).not.toEqual(originalUpdatedAt);
    });

    test("should have createdAt equal to updatedAt on creation", async () => {
      const product = new Product(validProductData);
      const savedProduct = await product.save();

      expect(savedProduct.createdAt).toBe(savedProduct.updatedAt);
    });
  });

  describe("Test search filter by name and description", () => {
    beforeEach(async () => {
      await Product.deleteMany();
  
      await Product.insertMany([
        { name: "iPhone 14", price: 999, description: "Latest Apple smartphone" },
        { name: "Samsung Galaxy S23", price: 899, description: "Flagship Android phone" },
        { name: "MacBook Pro", price: 1999, description: "Apple laptop with M2 chip" },
        { name: "Gaming Chair", price: 199, description: "Ergonomic chair for gamers" },
        { name: "USB-C Cable", price: 9.99, description: "Fast charging cable" },
      ]);
    });
  
    test("should find product by name", async () => {
      const results = await Product.find(
        { $text: { $search: "iPhone" } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } });
  
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("iPhone 14");
    });
  
    test("should find product by description", async () => {
      const results = await Product.find(
        { $text: { $search: "ergonomic" } },
        { score: { $meta: "textScore" } }
      );
  
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Gaming Chair");
    });
  
    test("should return multiple products if search matches several", async () => {
      const results = await Product.find(
        { $text: { $search: "Apple" } },
        { score: { $meta: "textScore" } }
      ).sort({ score: { $meta: "textScore" } });
  
      expect(results.length).toBe(2);
      const names = results.map((p) => p.name);
      expect(names).toContain("iPhone 14");
      expect(names).toContain("MacBook Pro");
    });
  
    test("should return empty array for no matches", async () => {
      const results = await Product.find(
        { $text: { $search: "nonexistent" } },
        { score: { $meta: "textScore" } }
      );
      expect(results.length).toBe(0);
    });
  });
  
});
