const _ = require('lodash');

class Response {
  constructor(client, message, match) {
    this.client = client;
    this.match = match;
    this.message = message;
    this.text = message.getContent();
    this.middlewares = null;
  }

  setMiddlewares(middlewares) {
    this.middlewares = middlewares;
  }

  _send(method, text, replyPublicIds = []) {
    let ids = [];
    if (!_.isArray(replyPublicIds)) {
      ids = [replyPublicIds];
    }
    if (this.middlewares) {
      this.middlewares.execute({
        response: this,
        text,
        replyPublicIds: ids,
        method
      })
      .then(() => this.client.sendText(text, ids));
    } else {
      this.client.sendText(text, ids);
    }
  }

  send(text, replyPublicIds = []) {
    this._send('send', text, replyPublicIds);
  }

  reply(text_, shouldTagNickName = true) {
    const sender = this.message.getSender();
    let text = text_;
    if (shouldTagNickName) {
      text = `@${sender.nickName} ${text_}`;
    }
    this._send('reply', text, sender.publicId);
  }

  random(texts, replyPublicIds = []) {
    this.send(_.sample(texts), replyPublicIds);
  }

  deleteMedia(url) {
    this.client.deleteMedia(url);
  }
}

module.exports = Response;
