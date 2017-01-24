const _ = require('lodash');

class Message {
  constructor(type, attributes = {}, payload = {}) {
    this.type = type;
    this.attributes = attributes;
    this.payload = payload;
  }

  getContent() {
    return this.payload.content;
  }

  getSender() {
    const payload = this.payload;
    return {
      publicId: payload.senderPublicId,
      nickName: payload.senderNickName
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

Message.EventTypes = {
  kekeMessage: 'KEKE_MESSAGE',
  chatMessage: 'CHAT_MESSAGE',
  deleteMedia: 'DELETE_MEDIA'
};

Message.Publishers = {
  server: 'SERVER',
  clientTransport: 'CLIENT_TRANSPORT'
};

module.exports = Message;
