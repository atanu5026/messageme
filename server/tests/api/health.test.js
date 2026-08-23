const request = require('supertest');
const app = require('../../src/app');

describe('Health API', () => {
  it('should return 200 and OK status on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Server is running');
  });
});
