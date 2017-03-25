const _ = require('lodash');

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

module.exports = Response;
