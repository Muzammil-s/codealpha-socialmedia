// backend/app.test.js
const request = require("supertest");
const app = require("./app");

describe("Basic API Test", () => {
  it("should return API working message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.msg).toBe("API is working 🚀");
  });
});
