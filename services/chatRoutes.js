const { Chats } = require('../models');
const { getChat, sendChatMessage } = require('./chatResolver');

const chatRoutes = async (app) => {
  app.post('/chat/start', async (req, res) => {
    try {
      const chat = await Chats.create();

      res.json({ chat });
    } catch (e) {
      res.status(500).json({ error: 'Failed to start chat' });
    }
  });

  app.get('/api/chat', async (req, res) => {
    try {
      const { chatId } = req.query;
      const isChatExist = await Chats.findOne({
        where: { chatId },
      });

      if (!isChatExist) res.json({ status: 'error', error: 'Chat not found', code: 401 });

      const { chat, messages } = await getChat({ chatId });

      res.json({ status: 'success', chat, messages });
    } catch (e) {
      res.status(500).json({ error: 'Failed to load chat', code: 403 });
    }
  });

  app.post('/chat/send', async (req, res) => {
    try {
      const { chatId, text } = req.body;

      const { userMessage, aiMessage } = await sendChatMessage({
        chatId,
        text,
      });

      res.json({
        chatId,
        userMessage,
        aiMessage,
      });
    } catch (e) {
      console.log('e', e);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });
};

module.exports = { chatRoutes };
