const path = require('path');

const {
  remote
} = require('electron');

const parent = remote.getCurrentWindow();
const webContents = remote.getCurrentWebContents();

module.exports = (Franz) => {
  // if the user is on gmail's landing page, go to the login page.
  if (location.hostname == 'www.google.com' && location.href.includes('gmail/about/')) {
    location.href = 'https://accounts.google.com/AccountChooser?service=mail&continue=https://mail.google.com/mail/';
  }

  const getMessages = function getMessages() {
    let count = 0;

    if (document.getElementsByClassName('J-Ke n0').length > 0) {
      if (document.getElementsByClassName('J-Ke n0')[0].getAttribute('aria-label') != null) {
        count = parseInt(document.getElementsByClassName('J-Ke n0')[0].getAttribute('aria-label').replace(/[^0-9.]/g, ''), 10);
      }
    }

    // Just incase we don't end up with a number, set it back to zero (parseInt can return NaN)
    count = parseInt(count, 10);
    if (isNaN(count)) {
      count = 0;
    }

    // set Franz badge
    Franz.setBadge(count);
  };

  const googleAccountIdParser = () => {
    const regex = /(.+) - ([0-9])/g;
    const title = parent.getTitle();

    let match = regex.exec(title);

    if (match != null && match.length > 0) {
      return match[2];
    }
    else {
      return null;
    }
  };

  const googleAuthUserUrlParser = (url, googleId) => {
    const regex = /(.+)authuser=([0-9])(.*)/g;

    try {
      let match = regex.exec(url);

      if (match != null && match.length > 0) {
        return `${match[1]}authuser=${googleId}${match[3]}`;
      }
      else {
        return null;
      }
    }
    catch (e) {
      console.error(`Error GoogleAuth URL[${url}]:`);
      console.error(e);

      return null;
    }
  };

  const hangoutsUrlParser = (url, googleId) => {
    const regex = /https:\/\/hangouts.google.com\/call\/(.+)/g;

    try {
      let match = regex.exec(url);

      if (match != null && match.length > 0) {
        return `https://hangouts.google.com/u/${googleId}/call/${match[1]}`;
      }
      else {
        return null;
      }
    }
    catch (e) {
      console.error(`Error GoogleAuth URL[${url}]:`);
      console.error(e);

      return null;
    }
  };

  const hangoutsConversationUrlParser = (url, googleId) => {
    const regex = /https:\/\/hangouts.google.com\/hangouts\/_\/CONVERSATION\/(.+)/g;

    try {
      let match = regex.exec(url);

      if (match != null && match.length > 0) {
        return `https://hangouts.google.com/u/${googleId}/call/CONVERSATION/${match[1]}`;
      }
      else {
        return null;
      }
    }
    catch (e) {
      console.error(`Error GoogleAuth URL[${url}]:`);
      console.error(e);

      return null;
    }
  };

  const externalUrlsParsers = [googleAuthUserUrlParser, hangoutsUrlParser, hangoutsConversationUrlParser];
  const parseExternalUrl = (url) => {
    const googleId = googleAccountIdParser(url);

    if (googleId != null) {
      for (let parser of externalUrlsParsers) {
        let newUrl = parser(url, googleId);

        if (newUrl != null) {
          return newUrl;
        }
      }
    }

    return null;
  }

  webContents.on('new-window', function (event, url) {
    let finalUrl = url;

    let newUrl = parseExternalUrl(url);
    if (newUrl != null) {
      finalUrl = newUrl;

      console.log(`Gmail Redirecting 'new-window' event to ${finalUrl}`);

      event.preventDefault();
      window.open(finalUrl);
    }
  });

  document.addEventListener('click', (e) => {
    const { tagName, target, href } = e.target;

    if (tagName === 'A' && target === '_blank') {
      let finalUrl = parseExternalUrl(href)
      if (finalUrl != null) {
        console.log(`Gmail Redirecting 'click' event to ${finalUrl}`);

        e.preventDefault();
        e.stopImmediatePropagation();
        window.open(finalUrl);
      }
    }
  }, true);

  Franz.injectCSS(path.join(__dirname, 'service.css'));
  // check for new messages every second and update Franz badge
  Franz.loop(getMessages);
};
