const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

let mongod;

/**
 * Global test setup — starts an in-memory MongoDB instance before all tests.
 */
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

/**
 * Clears all collections between test files to ensure isolation.
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Tears down the in-memory MongoDB and closes the connection.
 */
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

const config = require('../config/env');

/**
 * Generates a valid JWT for a test user.
 * @param {string} userId - The ObjectId string for the user
 * @returns {string} A signed JWT
 */
function makeToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '1h' });
}

module.exports = { makeToken };
