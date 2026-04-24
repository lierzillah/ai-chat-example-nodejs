const { Chats } = require('../models');
const { getChat, sendChatMessage } = require('./chatResolver');

const chatRoutes = async (app) => {
  app.post('/chat/start', async (req, res) => {
    try {
      const chat = await Chats.create();
      return res.json({ chat });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to start chat' });
    }
  });

  app.get('/api/chat', async (req, res) => {
    try {
      const { chatId } = req.query;
      const isChatExist = await Chats.findOne({ where: { chatId } });

      if (!isChatExist) {
        return res.status(404).json({ status: 'error', error: 'Chat not found' });
      }

      const { chat, messages } = await getChat({ chatId });
      return res.json({ status: 'success', chat, messages });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load chat' });
    }
  });

  app.post('/chat/send', async (req, res) => {
    try {
      const { chatId, text } = req.body;
      const { userMessage, aiMessage } = await sendChatMessage({ chatId, text });
      return res.json({ chatId, userMessage, aiMessage });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to send message' });
    }
  });
};

module.exports = { chatRoutes };