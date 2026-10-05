/* Telegram Mini App: подключает официальный скрипт только внутри Телеграма.
   Данные запуска приходят в хэше (#tgWebAppData=...) один раз, дальше скрипт хранит их в sessionStorage,
   поэтому на следующих страницах признаком служит именно он. Обычным посетителям лишний запрос не нужен. */
(function () {
  var s = '';
  try { s = sessionStorage.getItem('__telegram__initParams') || ''; } catch (e) { /* хранилище закрыто */ }
  if (/tgWebApp/.test(location.hash) || s) {
    document.documentElement.setAttribute('data-tg', '');
    document.write('<script src="https://telegram.org/js/telegram-web-app.js"><\/script>');
  }
})();
