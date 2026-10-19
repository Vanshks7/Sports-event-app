const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'sqlite:./server/database/community_multisports.db',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_community_multisports_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminSetupSecret: process.env.ADMIN_SETUP_SECRET || 'initial_bootstrap_admin_secret_key_change_me_in_prod_2026!',
  passwordTokenExpiresHours: parseInt(process.env.PASSWORD_TOKEN_EXPIRES_HOURS || '24', 10),
  isProduction: process.env.NODE_ENV === 'production'
};

module.exports = config;
