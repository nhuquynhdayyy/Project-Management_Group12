import * as dotenv from 'dotenv';

process.env.NODE_ENV = 'test';
// Load test environment variables
dotenv.config({ path: '.env.test' });
