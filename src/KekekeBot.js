const _ = require('lodash');
const Message = require('./Message');
const KekekeClient = require('./KekekeClient');

class InvalidBotNickName extends Error {}

class Response {
  constructor(client, message, match) {
    this.client = client;
    this.match = match;
    this.message = message;
    this.text = message.getContent();
  }

  send(text, replyPublicIds = []) {
    let ids = [];
    if (!_.isArray(replyPublicIds)) {
      ids = [replyPublicIds];
    }
    this.client.sendText(text, ids);
  }

  reply(text_, shouldTagNickName = true) {
    const sender = this.message.getSender();
    let text = text_;
    if (shouldTagNickName) {
      text = `@${sender.nickName} ${text_}`;
    }
    this.send(text, sender.publicId);
  }

  random(texts, replyPublicIds = []) {
    this.send(_.sample(texts), replyPublicIds);
  }

  deleteMedia(url) {
    this.client.deleteMedia(url);
  }
}

class KekekeBot {
  constructor(anonymousId, topic, nickname = 'KekekeBot') {
    if (!nickname.match(/bot$/i)) {
      throw new InvalidBotNickName();
    }
    this.listeners = [];
    this.client = new KekekeClient(anonymousId, topic, nickname);
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
      type: KekekeBot.listenerTypes.hear,
      pattern,
      callback
    });
  }

  respond(pattern, callback) {
    this.listeners.push({
      type: KekekeBot.listenerTypes.respond,
      pattern,
      callback
    });
  }

  listen(match, callback) {
    this.listeners.push({
      type: KekekeBot.listenerTypes.custom,
      match,
      callback
    });
  }

  handleMessage(message) {
    // check if the message was from a client
    // ignore bot messages to prevent recursions
    if (message.getPublisher() === Message.Publishers.clientTransport &&
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
        listeners = _.filter(listeners, l => l.type !== KekekeBot.listenerTypes.respond);
      }

      // dispatch
      for (const listener of listeners) {
        let match;
        if (listener.type === KekekeBot.listenerTypes.custom) {
          match = listener.match(content, isResponse);
        } else if (listener.type === KekekeBot.listenerTypes.respond) {
          const trimmedContent = content.trim().replace(nameRegex, '').trim();
          match = trimmedContent.match(listener.pattern);
        } else {
          // hear
          match = content.match(listener.pattern);
        }
        // match first found pattern
        if (match) {
          listener.callback(new Response(this.client, message, match));
          break;
        }
      }
    }
  }

  run() {
    this.client.on('message', this.handleMessage.bind(this));
    this.client.on('connected', () => {
      console.log(this.client.getNickName(), 'starts!');
      console.log('Kerma:', this.client.getKerma());
    });
    this.client.login();
  }
}

KekekeBot.listenerTypes = {
  hear: 'HEAR',
  respond: 'RESPOND',
  custom: 'CUSTOM'
};

module.exports = KekekeBot;
