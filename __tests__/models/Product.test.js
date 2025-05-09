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
  };

  describe("Validation Tests", () => {
    test("should validate a valid product", async () => {
      const validProduct = new Product(validProductData);
      const savedProduct = await validProduct.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe(validProductData.name);
      expect(savedProduct.price).toBe(99.99999);
      expect(savedProduct.description).toBe(validProductData.description);
    });

    test("should fail validation when name is missing", async () => {
      const productWithoutName = new Product({
        price: 99.99,
        description: "Test Description",
      });

      let err;
      try {
        await productWithoutName.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.wrongField).toBeDefined();
    });

    test("should not allow negative prices", async () => {
      const productWithNegativePrice = new Product({
        name: "Test Product",
        price: -10.99,
        description: "Test Description",
      });

      await expect(productWithNegativePrice.save()).resolves.toBeDefined();
    });

    test("should not allow string values for price", async () => {
      const productWithStringPrice = new Product({
        name: "Test Product",
        price: "99.99",
        description: "Test Description",
      });

      await expect(productWithStringPrice.save()).resolves.toBeDefined();
    });
  });

  describe("CRUD Operation Tests", () => {
    test("should create & save product successfully", async () => {
      const validProduct = new Product(validProductData);
      const savedProduct = await validProduct.save();

      const foundProduct = await Product.findById(savedProduct._id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct).toBe(savedProduct);
    });

    test("should update product successfully", async () => {
      const product = new Product(validProductData);
      await product.save();

      const updatedName = "Updated Product Name";
      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        { name: updatedName },
        { new: true }
      );

      expect(product.name).toBe(updatedName);
    });

    test("should handle concurrent updates correctly", async () => {
      const product = new Product(validProductData);
      await product.save();

      const update1 = Product.findByIdAndUpdate(product._id, { price: 199.99 });
      const update2 = Product.findByIdAndUpdate(product._id, { price: 299.99 });

      await Promise.all([update1, update2]);
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.price).toBe(199.99);
    });
  });

  describe("Timestamp Tests", () => {
    test("should have createdAt and updatedAt timestamps", async () => {
      const product = new Product(validProductData);
      const savedProduct = await product.save();

      expect(savedProduct.createdAt).toBeDefined();
      expect(savedProduct.updatedAt).toBeDefined();

      const originalUpdatedAt = savedProduct.updatedAt;
      await Product.findByIdAndUpdate(savedProduct._id, { price: 199.99 });
      expect(savedProduct.updatedAt).not.toBe(originalUpdatedAt);
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
