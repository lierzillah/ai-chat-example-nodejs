$(document).ready(function () {
  const $chatContainer = $('.chat-container');
  const $chatMessages = $chatContainer.find('.chat-messages');
  const $chatInput = $('.chat-input input');
  const $chatButton = $('.chat-input button');
  const $chatIdInput = $('#chat_id');

  function renderMessage(text, type) {
    const cls = type === 'AI' ? 'ai' : 'user';
    const $message = $('<div>')
      .addClass('chat-message ' + cls)
      .text(text);
    $chatMessages.append($message);
    $chatMessages.scrollTop($chatMessages[0].scrollHeight);
  }

  function setLoading(isLoading) {
    $chatButton.prop('disabled', isLoading);
    $chatInput.prop('disabled', isLoading);
  }

  function loadMessages(chatId) {
    $.get('/api/chat', { chatId }, function (res) {
      if (res.status === 'error') {
        localStorage.removeItem('chatId');
        startChat();
        return;
      }

      $chatMessages.find('.chat-message').not(':first').remove();
      res.messages?.forEach((msg) => renderMessage(msg.text, msg.type));
    });
  }

  function startChat() {
    const chatId = localStorage.getItem('chatId');
    if (chatId) {
      $chatIdInput.val(chatId);
      loadMessages(chatId);
      return;
    }

    $.post('/chat/start', function (res) {
      if (res.chat?.chatId) {
        localStorage.setItem('chatId', res.chat.chatId);
        $chatIdInput.val(res.chat.chatId);
        loadMessages(res.chat.chatId);
      }
    });
  }

  function sendMessage() {
    const text = $chatInput.val().trim();
    const chatId = $chatIdInput.val();

    if (!text || !chatId) return;

    renderMessage(text, 'USER');
    $chatInput.val('');
    setLoading(true);

    $.ajax({
      url: '/chat/send',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ chatId, text }),
      success: function (res) {
        if (res.aiMessage) renderMessage(res.aiMessage, 'AI');
      },
      error: function () {
        renderMessage('Помилка відправки. Спробуй ще раз.', 'AI');
      },
      complete: function () {
        setLoading(false);
      },
    });
  }

  $chatButton.on('click', sendMessage);
  $chatInput.on('keypress', function (e) {
    if (e.which === 13) sendMessage();
  });

  startChat();
});
