const mongoose = require('mongoose');
const User = require('../../src/models/User');

describe('User Model Test', () => {
  it('should create and save a user successfully', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phoneNumber: '1234567890'
    };
    const validUser = new User(userData);
    const savedUser = await validUser.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.password).toBeDefined(); // Password should be hashed if we were testing pre-save middleware, but here it's just saved
    expect(savedUser.connectCode).toBeDefined(); // connectCode is generated on save
  });

  it('should fail if required fields are missing', async () => {
    const userWithoutRequiredFields = new User({ name: 'Incomplete' });
    let err;
    try {
      await userWithoutRequiredFields.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });
});
