// backend/auth.test.js
require("dotenv").config();

const request = require("supertest");
const app = require("./app"); // your express app
const mongoose = require("mongoose");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});


afterAll(async () => {
  // Clean database + close connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe("Auth API", () => {
  let testUser = { username: "testuser", email: "test@example.com", password: "123456" };

  it("should register a new user", async () => {
    const res = await request(app).post("/signup").send(testUser);
    expect(res.statusCode).toBe(201); // or 200 based on your code
    expect(res.body).toHaveProperty("msg");
  });

  it("should NOT register user with existing email", async () => {
    const res = await request(app).post("/signup").send(testUser);
    expect(res.statusCode).toBe(400); // or whatever your error code is
    expect(res.body).toHaveProperty("msg");
  });

  it("should login with correct credentials", async () => {
    const res = await request(app).post("/login").send({
      email: testUser.email,
      password: testUser.password
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token"); // if you return token
  });

  it("should NOT login with wrong password", async () => {
    const res = await request(app).post("/login").send({
      email: testUser.email,
      password: "wrongpass"
    });
    expect(res.statusCode).toBe(400); // or 401
    expect(res.body).toHaveProperty("msg");
  });
});
