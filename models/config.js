require('dotenv').config();
const { Sequelize } = require('sequelize');
const { DB_USERNAME, DB_PASSWORD, DB_NAME, DB_HOST } = process.env;

const sequelize = new Sequelize(
  `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'test' ? false : console.log,
  },
);

module.exports = { sequelize };
