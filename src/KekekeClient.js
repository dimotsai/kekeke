const EventEmitter = require('events');
const {AllHtmlEntities} = require('html-entities');
const WebSocket = require('ws');
const request = require('request-promise');
const entities = new AllHtmlEntities();
const _ = require('lodash');
const Message = require('./Message');

class NotLoggedInError extends Error {}

class KekekeClient extends EventEmitter {
  constructor(anonymousId, topic, nickname = 'KekekeClient') {
    super();
    this.anonymousId = anonymousId;
    this.topic = topic;
    this.nickname = nickname;
  }

  login() {
    const offsets = {
      info: -3,
      anonymousId: -6,
      accessToken: -7,
      colorToken: -9,
      ip: -12,
      kerma: -13,
      publicId: -18
    };
    const data = `7|0|8|https://kekeke.cc/com.liquable.hiroba.square.gwt.SquareModule/|53263EDF7F9313FDD5BD38B49D3A7A77|com.liquable.hiroba.gwt.client.square.IGwtSquareService|startSquare|com.liquable.hiroba.gwt.client.square.StartSquareRequest/2186526774|${this.anonymousId}|com.liquable.gwt.transport.client.Destination/2061503238|/topic/${this.topic}|1|2|3|4|1|5|5|6|0|7|8|`;
    return request({
      uri: 'https://kekeke.cc/com.liquable.hiroba.gwt.server.GWTHandler/squareService',
      method: 'POST',
      body: data,
      json: false,
      gzip: true,
      headers: {
        Pragma: 'no-cache',
        Origin: 'https://kekeke.cc',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,ja;q=0.2',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36',
        'Content-Type': 'text/x-gwt-rpc; charset=UTF-8',
        Accept: '*/*',
        'X-GWT-Module-Base': 'https://kekeke.cc/com.liquable.hiroba.square.gwt.SquareModule/',
        Referer: `https://kekeke.cc/${encodeURI(this.topic)}`,
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache'
      }
    }).then(data => {
      const arrString = data.replace(/^\/\/[^[]+/, '');
      const arr = JSON.parse(arrString);
      const len = arr.length;
      const offs = _.mapValues(offsets, off => len + off);
      const info = arr[offs.info];
      this.accessToken = info[arr[offs.accessToken] - 1];
      this.publicId = info[arr[offs.publicId] - 1];
      this.colorToken = info[arr[offs.colorToken] - 1];
      this.kerma = arr[offs.kerma];
      this.emit('login', {
        accessToken: this.accessToken,
        publicId: this.publicId,
        kerma: this.kerma
      });
    }).then(() => {
      return this._initWebSocket();
    });
  }

  sendText(text, replyPublicIds = []) {
    const message = new Message('SEND', {
      destination: `/topic/${this.topic}`
    }, {
      senderColorToken: this.colorToken,
      senderPublicId: this.publicId,
      senderNickName: this.nickname,
      content: entities.encode(text),
      date: Date.now().toString(),
      eventType: 'CHAT_MESSAGE',
      payload: {
        replyPublicIds
      }
    });

    this._sendMessage(message);
  }

  deleteMedia(url) {
    const message = new Message('SEND', {
      destination: `/topic/${this.topic}`
    }, {
      senderColorToken: this.colorToken,
      senderPublicId: this.publicId,
      senderNickName: this.nickname,
      content: entities.encode(`delete ${url}`),
      date: Date.now().toString(),
      eventType: 'DELETE_MEDIA'
    });

    this._sendMessage(message);
  }

  getPublicId() {
    return this.publicId;
  }

  getColorToken() {
    return this.colorToken;
  }

  getNickName() {
    return this.nickname;
  }

  getKerma() {
    return this.kerma;
  }

  close() {
    this.ws.close();
  }

  _sendMessage(message) {
    if (this.ws) {
      this.ws.send(message.toString());
      this.emit('send', message);
    } else {
      throw new NotLoggedInError();
    }
  }

  _initWebSocket() {
    this.ws = new WebSocket('wss://ws.kekeke.cc/com.liquable.hiroba.websocket');

    this.ws.on('close', () => {
      this.emit('close');
    });

    this.ws.on('open', () => {
      const payload = {
        accessToken: this.accessToken,
        nickname: this.nickname
      };
      const message = new Message('CONNECT', {login: JSON.stringify(payload)});
      this._sendMessage(message);

      setInterval(() => {
        const sendMsg = new Message('PING');
        this._sendMessage(sendMsg);
      }, 180000);
      this.emit('open');
    });

    this.ws.on('message', data => {
      let sendMsg;
      let recvMsg;
      try {
        recvMsg = Message.from(data);
      } catch (e) {
        console.error(data);
        console.error(e);
        return;
      }

      switch (recvMsg.type) {
        case 'CONNECTED':
          sendMsg = new Message('SUBSCRIBE', {destination: `/topic/${this.topic}`});
          this._sendMessage(sendMsg);
          this.emit('connected', recvMsg);
          break;
        case 'PING':
          sendMsg = new Message('PONG');
          this._sendMessage(sendMsg);
          this.emit('ping', recvMsg);
          break;
        case 'MESSAGE':
          this.emit('message', recvMsg);
          break;
        default:
          break;
      }
    });
  }
}

module.exports = KekekeClient;
