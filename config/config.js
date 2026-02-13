require('dotenv').config();

const {
  DB_USERNAME: username,
  DB_PASSWORD: password,
  DB_NAME: database,
  DB_HOST: host,
} = process.env;

module.exports = {
  development: {
    username,
    password,
    database,
    host: host || 'localhost',
    dialect: 'postgres',
  },
  production: {
    username,
    password,
    database,
    host: host || 'db',
    dialect: 'postgres',
  },
};
