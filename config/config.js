require('dotenv').config();

const {
  DB_USERNAME: username,
  DB_PASSWORD: password,
  DB_NAME: database,
  DB_HOST: host,
} = process.env;

const config = {
  username,
  password,
  database,
  host: host || 'localhost',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'test' ? false : console.log,
};

module.exports = {
  development: config,
  production: { ...config, host: host || 'db' },
};
