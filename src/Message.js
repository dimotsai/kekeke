const _ = require('lodash');
const {AllHtmlEntities} = require('html-entities');
const entities = new AllHtmlEntities();

class Message {
  constructor(type, attributes = {}, payload = {}) {
    this.type = type;
    this.attributes = attributes;
    this.payload = payload;
  }

  getContent() {
    if (this.payload.content) {
      return entities.decode(this.payload.content);
    }
    return this.payload.content;
  }

  getSender() {
    const payload = this.payload;
    return {
      publicId: payload.senderPublicId,
      nickName: payload.senderNickName,
      colorToken: payload.senderColorToken
    };
  }

  getEventType() {
    return this.payload.eventType;
  }

  getReplyPublicIds() {
    if (this.payload.payload && this.payload.payload.replyPublicIds) {
      return this.payload.payload.replyPublicIds;
    }
    return [];
  }

  getPublisher() {
    return this.attributes.publisher;
  }

  isBroadcast() {
    return this.getReplyPublicIds().length === 0;
  }

  toString() {
    let str = '';
    str += this.type + '\n';
    _.forEach(this.attributes, (attr, name) => {
      str += name + ':' + attr + '\n';
    });
    str += '\n';
    if (this.payload) {
      str += JSON.stringify(this.payload);
    }
    return str;
  }

  static from(str) {
    const lines = str.split('\n');
    const type = lines.shift();
    const attributes = {};
    let payload;

    let currentLine = lines.shift();

    while (currentLine !== undefined && currentLine !== '') {
      const tokens = currentLine.split(':');
      const key = tokens[0];
      const value = tokens[1];
      attributes[key] = value;

      currentLine = lines.shift();
    }

    currentLine = lines.shift();

    if (currentLine !== undefined && currentLine !== '') {
      payload = JSON.parse(currentLine);
    }

    return new Message(type, attributes, payload);
  }
}

Message.types = {
  connected: 'CONNECTED',
  ping: 'PING',
  pong: 'PONG',
  message: 'MESSAGE',
  subscribe: 'SUBSCRIBE'
};

Message.eventTypes = {
  kekeMessage: 'KEKE_MESSAGE',
  chatMessage: 'CHAT_MESSAGE',
  deleteMedia: 'DELETE_MEDIA'
};

Message.publishers = {
  server: 'SERVER',
  clientTransport: 'CLIENT_TRANSPORT'
};

module.exports = Message;
