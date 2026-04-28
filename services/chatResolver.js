const { Messages, Chats } = require('../models');
const PROMPTS = require('../prompts');
const OpenAI = require('openai');
const logger = require('../logger/logger');
const redis = require('./redis');

const { OPENAI_API_KEY, MAX_MESSAGES_PER_CHAT, MIN_INTERVAL_MS } = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const detectPrompt = (text) => {
  const t = text.toLowerCase();

  if (t.includes('ai') || t.includes('штуч')) return PROMPTS.AI_EXPLANATION;
  if (t.includes('куди') || t.includes('інвест')) return PROMPTS.INVEST_DIRECTIONS;
  if (t.includes('формат') || t.includes('як проход')) return PROMPTS.LEARNING_FORMAT;
  if (t.includes('трейд') || t.includes('сигнал') || t.includes('бот')) return PROMPTS.ANTI_SCAM;
  if (t.includes('пакет')) return PROMPTS.PACKAGES;
  if (t.includes('гарант') || t.includes('повернен')) return PROMPTS.GUARANTEE_EXTENDED;
  if (t.includes('як це працю')) return PROMPTS.HOW_IT_WORKS;
  if (t.includes('додат')) return PROMPTS.APP;
  if (t.includes('форум') || t.includes('комʼюніті')) return PROMPTS.COMMUNITY;
  if (t.includes('автор') || t.includes('кір')) return PROMPTS.AUTHOR;
  if (t.includes('для кого')) return PROMPTS.FOR_WHO;
  if (t.includes('програм')) return PROMPTS.PROGRAM;
  if (t.includes('коли') && t.includes('старт')) return PROMPTS.START;
  if (t.includes('замороз') || t.includes('продовж')) return PROMPTS.FREEZE;
  if (t.includes('фідбек') || t.includes('зворот')) return PROMPTS.FEEDBACK;
  if (t.includes('далі') || t.includes('наступ')) return PROMPTS.NEXT_STEP;

  return PROMPTS.DEFAULT;
};

const getChat = async ({ chatId }) => {
  try {
    const chat = await Chats.findOne({ where: { chatId } });

    const cached = await redis.get(`history:${chatId}`);
    if (cached) {
      return { chat, messages: JSON.parse(cached) };
    }

    const messages = await Messages.findAll({
      where: { chatId },
      order: [['created_at', 'ASC']],
    });

    await redis.set(`history:${chatId}`, JSON.stringify(messages), 'EX', 3600);

    return { chat, messages };
  } catch (e) {
    logger.error('get_chat_failed', {
      chatId,
      error: e.message,
      stack: e.stack,
    });
    throw e;
  }
};

const sendChatMessage = async ({ chatId, text }) => {
  try {
    const rateLimitKey = `rate:${chatId}`;
    const isRateLimited = await redis.get(rateLimitKey);
    if (isRateLimited) {
      return {
        chatId,
        userMessage: text,
        aiMessage: 'Почекай кілька секунд перед наступним повідомленням.',
      };
    }
    await redis.set(rateLimitKey, '1', 'PX', Number(MIN_INTERVAL_MS));

    const countKey = `msg_count:${chatId}`;
    const count = await redis.incr(countKey);
    if (count === 1) {
      const realCount = await Messages.count({ where: { chatId, type: 'USER' } });
      if (realCount > 0) {
        await redis.set(countKey, realCount);
      }
    }
    if (count > Number(MAX_MESSAGES_PER_CHAT)) {
      return {
        chatId,
        userMessage: text,
        aiMessage: 'Ліміт повідомлень досягнуто. Створіть новий чат або зачекайте.',
      };
    }

    await Messages.create({ chatId, text, type: 'USER' });

    const historyKey = `history:${chatId}`;
    let messages;
    const cached = await redis.get(historyKey);
    if (cached) {
      messages = JSON.parse(cached);
    } else {
      const rows = await Messages.findAll({
        where: { chatId },
        order: [['createdAt', 'ASC']],
        limit: 10,
      });
      messages = rows.map((m) => ({
        role: m.type === 'AI' ? 'assistant' : 'user',
        content: m.text,
      }));
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: PROMPTS.SYSTEM_BASE },
        { role: 'system', content: detectPrompt(text) },
        ...messages,
      ],
    });

    const aiText = completion.choices[0].message.content;

    await Messages.create({ chatId, text: aiText, type: 'AI' });

    await redis.del(historyKey);

    return { chatId, userMessage: text, aiMessage: aiText };
  } catch (e) {
    logger.error('send_chat_message_failed', {
      chatId,
      error: e.message,
      stack: e.stack,
    });
    return {
      chatId,
      userMessage: text,
      aiMessage: 'Сталася помилка. Спробуй пізніше.',
    };
  }
};

module.exports = { getChat, sendChatMessage };