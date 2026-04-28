const { Chats } = require('../models');
const { getChat, sendChatMessage } = require('./chatResolver');
const logger = require('../logger/logger');

const chatRoutes = (app, apiLimiter) => {
  app.post('/chat/start', apiLimiter, async (req, res) => {
    try {
      const chat = await Chats.create();
      return res.json({ chat });
    } catch (e) {
      logger.error('create_chat_failed', {
        error: e.message,
        stack: e.stack,
      });
      return res.status(500).json({ error: 'Failed to start chat' });
    }
  });

  app.get('/api/chat', apiLimiter, async (req, res) => {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    try {
      const chat = await Chats.findOne({ where: { chatId } });

      if (!chat) {
        return res.status(404).json({ status: 'error', error: 'Chat not found' });
      }

      const { messages } = await getChat({ chatId });
      return res.json({ status: 'success', chat, messages });
    } catch (e) {
      logger.error('get_chat_failed', {
        chatId,
        error: e.message,
        stack: e.stack,
      });
      return res.status(500).json({ error: 'Failed to load chat' });
    }
  });

  app.post('/chat/send', apiLimiter, async (req, res) => {
    const { chatId, text } = req.body;

    if (!chatId || !text?.trim()) {
      return res.status(400).json({ error: 'chatId and text are required' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    try {
      const { userMessage, aiMessage } = await sendChatMessage({ chatId, text });
      return res.json({ chatId, userMessage, aiMessage });
    } catch (e) {
      logger.error('send_chat_message_failed', {
        chatId,
        error: e.message,
        stack: e.stack,
      });
      return res.status(500).json({ error: 'Failed to send message' });
    }
  });
};

module.exports = { chatRoutes };