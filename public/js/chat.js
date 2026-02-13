$(document).ready(function () {
  // localStorage.removeItem('chatId');
  const $chatContainer = $('.chat-container');
  const $chatMessages = $chatContainer.find('.chat-messages');
  const $chatInput = $('.chat-input input');
  const $chatButton = $('.chat-input button');
  const $chatIdInput = $('#chat_id');

  function renderMessage(text, type) {
    const cls = type === 'AI' ? 'ai' : 'user';
    const message = $('<div>')
      .addClass('chat-message ' + cls)
      .text(text);

    $chatMessages.append(message);
    $chatMessages.scrollTop($chatMessages[0].scrollHeight);
  }

  function loadMessages(chatId, callback) {
    $.get('/api/chat', { chatId }, function (res) {
      if (res.status === 'error') {
        if (res.code === 401) {
          localStorage.removeItem('chatId');
          startChat();
        }
        return;
      }

      $chatMessages.find('.chat-message').not(':first').remove();

      res.messages?.forEach((msg) => {
        renderMessage(msg.text, msg.type);
      });

      if (callback) callback();
    });
  }

  function startChat() {
    let chatId = localStorage.getItem('chatId');

    if (chatId) {
      $chatIdInput.val(chatId);
      loadMessages(chatId);
    } else {
      $.post('/chat/start', function (res) {
        if (res.chat && res.chat.chatId) {
          chatId = res.chat.chatId;
          localStorage.setItem('chatId', chatId);
          $chatIdInput.val(chatId);
          loadMessages(chatId);
        }
      });
    }
  }

  function sendMessage() {
    const text = $chatInput.val().trim();
    const chatId = $chatIdInput.val();

    if (!text || !chatId) return;

    renderMessage(text, 'USER');
    $chatInput.val('');

    $.ajax({
      url: '/chat/send',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        chatId,
        text,
        type: 'USER',
      }),
      success: function (res) {
        if (res.aiMessage) {
          renderMessage(res.aiMessage, 'AI');
        }
      },
    });
  }

  $chatButton.on('click', sendMessage);
  $chatInput.on('keypress', function (e) {
    if (e.which === 13) sendMessage();
  });

  startChat();
});
