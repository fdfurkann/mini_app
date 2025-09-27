import { testConnection } from './config/database';

// Test database connection on startup
testConnection().catch(console.error);

// ... existing code ... 