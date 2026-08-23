const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(60000); // 60 seconds to allow Mongo download

// Mock env vars needed for app startup
process.env.VAPID_PUBLIC_KEY = 'mock_vapid_public_key';
process.env.VAPID_PRIVATE_KEY = 'mock_vapid_private_key';
process.env.JWT_ACCESS_SECRET = 'mock_jwt_secret';
process.env.JWT_REFRESH_SECRET = 'mock_jwt_refresh_secret';
process.env.CLOUDINARY_CLOUD_NAME = 'mock_cloudinary_name';
process.env.CLOUDINARY_API_KEY = 'mock_cloudinary_key';
process.env.CLOUDINARY_API_SECRET = 'mock_cloudinary_secret';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn()
}));

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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
