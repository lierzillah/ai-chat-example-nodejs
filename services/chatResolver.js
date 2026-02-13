const { Messages, Chats } = require('../models');
const PROMPTS = require('../promts');
const OpenAI = require('openai');

const { OPENAI_API_KEY, MAX_MESSAGES_PER_CHAT, MIN_INTERVAL_MS } = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const detectPrompt = (text) => {
  const t = text.toLowerCase();

  if (t.includes('ai') || t.includes('штуч')) return PROMPTS.AI_EXPLANATION;
  if (t.includes('куди') || t.includes('інвест'))
    return PROMPTS.INVEST_DIRECTIONS;
  if (t.includes('формат') || t.includes('як проход'))
    return PROMPTS.LEARNING_FORMAT;
  if (t.includes('трейд') || t.includes('сигнал') || t.includes('бот'))
    return PROMPTS.ANTI_SCAM;
  if (t.includes('пакет')) return PROMPTS.PACKAGES;
  if (t.includes('гарант') || t.includes('повернен'))
    return PROMPTS.GUARANTEE_EXTENDED;
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
    const chat = await Chats.findOne({
      where: { chatId },
    });

    const messages = await Messages.findAll({
      where: { chatId },
      order: [['created_at', 'ASC']],
    });
    return { chat, messages };
  } catch (ex) {
    console.log('ex', ex);
  }
};

const sendChatMessage = async ({ chatId, text }) => {
  try {
    const userMessagesCount = await Messages.count({
      where: { chatId, type: 'USER' },
    });

    if (userMessagesCount >= MAX_MESSAGES_PER_CHAT) {
      return {
        chatId,
        userMessage: text,
        aiMessage:
          'Ліміт повідомлень досягнуто. Створіть новий чат або зачекайте.',
      };
    }

    const lastUserMessage = await Messages.findOne({
      where: { chatId, type: 'USER' },
      order: [['createdAt', 'DESC']],
    });

    if (
      lastUserMessage &&
      Date.now() - new Date(lastUserMessage.createdAt) < MIN_INTERVAL_MS
    ) {
      return {
        chatId,
        userMessage: text,
        aiMessage: 'Почекай кілька секунд перед наступним повідомленням.',
      };
    }

    await Messages.create({
      chatId,
      text,
      type: 'USER',
    });

    const history = await Messages.findAll({
      where: { chatId },
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    const messages = history.reverse().map((m) => ({
      role: m.type === 'AI' ? 'assistant' : 'user',
      content: m.text,
    }));

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: PROMPTS.SYSTEM_BASE },
        { role: 'system', content: detectPrompt(text) },
        ...messages,
      ],
    });

    const aiText = completion.choices[0].message.content;

    await Messages.create({
      chatId,
      text: aiText,
      type: 'AI',
    });

    return {
      chatId,
      userMessage: text,
      aiMessage: aiText,
    };
  } catch (e) {
    console.log('e', e);
    return {
      chatId,
      userMessage: text,
      aiMessage: 'Сталася помилка. Спробуй пізніше.',
    };
  }
};

module.exports = { getChat, sendChatMessage };
