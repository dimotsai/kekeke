const Promise = require('bluebird');
const _ = require('lodash');
const Message = require('./Message');
const Client = require('./Client');
const Response = require('./Response');

class InvalidBotNickName extends Error {}

class Bot {
  constructor(anonymousId, topic, nickname = 'KekekeBot') {
    if (!nickname.match(/bot$/i)) {
      throw new InvalidBotNickName();
    }
    this.listeners = [];
    this.client = new Client(anonymousId, topic, nickname);
  }

  getNickName() {
    return this.client.getNickName();
  }

  getPublicId() {
    return this.client.getPublicId();
  }

  getKerma() {
    return this.client.getKerma();
  }

  hear(pattern, callback) {
    this.listeners.push({
      type: Bot.listenerTypes.hear,
      pattern,
      callback
    });
  }

  respond(pattern, callback) {
    this.listeners.push({
      type: Bot.listenerTypes.respond,
      pattern,
      callback
    });
  }

  listen(match, callback) {
    this.listeners.push({
      type: Bot.listenerTypes.custom,
      match,
      callback
    });
  }

  handleMessage(message) {
    // check if the message is from a client
    // ignore bot messages to prevent recursions
    if (message.getPublisher() === Message.publishers.clientTransport &&
      message.getSender().publicId !== this.client.getPublicId() &&
      !message.getSender().nickName.match(/bot$/i)) {
      const content = message.getContent();
      const nameRegex = new RegExp(`^@${this.client.getNickName()}\\s+`, 'i');
      let listeners = this.listeners;
      let isResponse = false;

      // check if the message is a response to the bot
      if (message.getReplyPublicIds().indexOf(this.client.getPublicId()) !== -1 ||
        content.trim().match(nameRegex, 'i')) {
        isResponse = true;
      } else {
        listeners = _.filter(listeners, l => l.type !== Bot.listenerTypes.respond);
      }

      let found;
      Promise.each(listeners, listener => {
        // skip remaining if found
        if (found) {
          return;
        }

        const trimmedContent = content.trim().replace(nameRegex, '').trim();
        let match;
        if (listener.type === Bot.listenerTypes.custom) {
          match = listener.match(isResponse ? trimmedContent : content, isResponse);
        } else if (listener.type === Bot.listenerTypes.respond) {
          match = trimmedContent.match(listener.pattern);
        } else {
          // hear
          match = content.match(listener.pattern);
        }

        // match could be a value or a promise
        return Promise.resolve(match).then(m => {
          if (m) {
            found = {
              listener,
              match: m
            };
          }
        });
        // Note: Promise.each return the original array
      }).then(() => {
        if (found) {
          return found.listener.callback(new Response(this.client, message, found.match));
        }
      });
    }
  }

  run() {
    this.client.on('message', this.handleMessage.bind(this));
    this.client.on('connected', () => {
      console.log(this.client.getNickName(), 'starts!');
      console.log('Public ID:', this.client.getPublicId());
      console.log('Color Token:', this.client.getColorToken());
      console.log('Kerma:', this.client.getKerma());
    });
    this.client.login();
  }
}

Bot.listenerTypes = {
  hear: 'HEAR',
  respond: 'RESPOND',
  custom: 'CUSTOM'
};

module.exports = Bot;
