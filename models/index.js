const Sequelize = require('sequelize');
const sequelize = require('./config').sequelize;

const Chats = sequelize.define(
  'Chats',
  {
    chatId: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: Sequelize.STRING,
    },
    token: {
      type: Sequelize.TEXT,
    },
  },
  {
    schema: 'public',
    tableName: 'chats',
    timestamps: false,
    underscored: true,
  },
);

const Messages = sequelize.define(
  'Messages',
  {
    messageId: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    chatId: {
      type: Sequelize.UUID,
    },
    text: {
      type: Sequelize.TEXT,
    },
    type: {
      type: Sequelize.STRING,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    schema: 'public',
    tableName: 'messages',
    timestamps: true,
    underscored: true,
  },
);

Chats.hasMany(Messages, { foreignKey: 'chatId', as: 'messages' });
Messages.belongsTo(Chats, { foreignKey: 'chatId', as: 'chat' });

module.exports = {
  Chats,
  Messages,
};
