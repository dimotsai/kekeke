const Promise = require('bluebird');
const _ = require('lodash');
const Message = require('./Message');
const Client = require('./Client');
const Response = require('./Response');
const Middleware = require('./Middleware');
const {InvalidBotNickName, ListenerNotFound, MiddlewareDone} = require('./errors');

class Bot {
  constructor(anonymousId, topic, nickname = 'KekekeBot') {
    if (!nickname.match(/bot$/i)) {
      throw new InvalidBotNickName();
    }
    this.listeners = [];
    this.receiveMiddlewares = new Middleware();
    this.listenerMiddlewares = new Middleware();
    this.responseMiddlewares = new Middleware();
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

  findListener(message) {
    const content = message.getContent();
    const nameRegex = new RegExp(`^@${this.client.getNickName()}\\s+`, 'i');
    let listeners = this.listeners;
    let isResponse = false;
    let found;
    // check if the message is a response to the bot
    if (message.getReplyPublicIds().indexOf(this.client.getPublicId()) !== -1 ||
      content.trim().match(nameRegex, 'i')) {
      isResponse = true;
    } else {
      listeners = _.filter(listeners, l => l.type !== Bot.listenerTypes.respond);
    }
    return Promise.each(listeners, listener => {
      // skip remaining if found
      if (found) {
        return;
      }

      const trimmedContent = content.trim().replace(nameRegex, '').trim();
      let match;
      if (listener.type === Bot.listenerTypes.custom) {
        match = listener.match(isResponse ? trimmedContent : content, isResponse, message.isBroadcast());
      } else if (listener.type === Bot.listenerTypes.respond) {
        match = trimmedContent.match(listener.pattern);
      } else if (message.isBroadcast()) {
        // hear a message that does not reply to anyone
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
        return found;
      }
      throw new ListenerNotFound();
    });
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

  /**
   * Register a receive middleware
   * @param {Middleware~middleware} middleware
   */
  receiveMiddleware(middleware) {
    this.receiveMiddlewares.register(middleware);
  }

  /**
   * Register a listener middleware
   * @param {Middleware~middleware} middleware
   */
  listenerMiddleware(middleware) {
    this.listenerMiddlewares.register(middleware);
  }

  /**
   * Register a response middleware
   * @param {Middleware~middleware} middleware
   */
  responseMiddleware(middleware) {
    this.responseMiddlewares.register(middleware);
  }

  handleMessage(message) {
    // check if the message is from a client
    // ignore bot messages to prevent recursions
    if (message.getPublisher() === Message.publishers.clientTransport &&
      message.getSender().publicId !== this.client.getPublicId() &&
      !message.getSender().nickName.match(/bot$/i)) {
      // execute receive middlewares
      this.receiveMiddlewares.execute({
        response: new Response(this.client, message, null)
      })
      .then(() => this.findListener(message))
      // execute listener middlewares
      .then(found => this.listenerMiddlewares.execute({
        listener: found.listener,
        match: found.match,
        response: new Response(this.client, message, found.match)
      })
      .then(context => {
        const response = new Response(this.client, message, context.match);
        response.setMiddlewares(this.responseMiddlewares);
        context.listener.callback(response);
      }))
      .catch(MiddlewareDone, () => {})
      .catch(ListenerNotFound, () => {});
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
