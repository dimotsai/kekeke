const chai = require('chai');
const Message = require('../src/Message');

chai.use(require('chai-as-promised'));
const should = chai.should();

describe('Message', () => {
  describe('#getContent', () => {
    it('should get a string', () => {
      const message = new Message(
        Message.types.message,
        {},
        {content: 'foo'}
      );
      message.getContent().should.equal('foo');
    });

    it('should get a decoded string if the content is encoded', () => {
      const message = new Message(
        Message.types.message,
        {},
        {content: '&#x3C;p&#x3E;foo&#x3C;/p&#x3E;'}
      );
      message.getContent().should.equal('<p>foo</p>');
    });

    it('should get an undefined if the content is empty', () => {
      const message = new Message(Message.types.message);
      should.not.exist(message.getContent());
    });
  });

  describe('#getSender', () => {
    it('should get an object of sender\'s information', () => {
      const message = new Message(Message.types.message, {}, {senderPublicId: 'abc', senderNickName: 'foo'});
      message.getSender().should.deep.equal({
        publicId: 'abc',
        nickName: 'foo',
        colorToken: undefined
      });
    });
  });

  describe('#getEventType', () => {
    it('should get a event type', () => {
      const message = new Message(Message.types.message, {}, {eventType: Message.eventTypes.chatMessage});
      message.getEventType().should.equal(Message.eventTypes.chatMessage);
    });
  });

  describe('#getReplyPublicIds', () => {
    it('should get an empty array if there is no replyPublicIds', () => {
      const message = new Message(Message.types.message);
      message.getReplyPublicIds().should.eql([]);
    });

    it('should get an array of publicIds', () => {
      const message = new Message(Message.types.message, {}, {payload: {replyPublicIds: ['foo', 'bar', 'baz']}});
      message.getReplyPublicIds().should.eql(['foo', 'bar', 'baz']);
    });
  });

  describe('#getPublisher', () => {
    it('should get a publisher', () => {
      const message = new Message(Message.types.message, {publisher: Message.publishers.clientTransport});
      message.getPublisher().should.equal(Message.publishers.clientTransport);
    });

    it('should get an array of publicIds', () => {
      const message = new Message(Message.types.message, {}, {payload: {replyPublicIds: ['foo', 'bar', 'baz']}});
      message.getReplyPublicIds().should.eql(['foo', 'bar', 'baz']);
    });
  });

  describe('#toString', () => {
    it('should be serialized to a string', () => {
      const target = `MESSAGE
destination:/topic/crusaders-quest
publisher:CLIENT_TRANSPORT

{"senderPublicId":"cf0fbd9155ef688e5548e6d1d38dd3aab356362d","senderNickName":"Foo","anchorUsername":"","content":"@Bar Baz!","date":"1485435703926","eventType":"CHAT_MESSAGE","payload":{"replyPublicIds":["3cdce7db4055021cdb90a05e4131740d847eff2c"]}}`;
      const message = new Message(
        Message.types.message,
        {
          destination: '/topic/crusaders-quest',
          publisher: Message.publishers.clientTransport
        },
        {
          senderPublicId: 'cf0fbd9155ef688e5548e6d1d38dd3aab356362d',
          senderNickName: 'Foo',
          anchorUsername: '',
          content: '@Bar Baz!',
          date: '1485435703926',
          eventType: 'CHAT_MESSAGE',
          payload: {replyPublicIds: ['3cdce7db4055021cdb90a05e4131740d847eff2c']}
        }
      );
      message.toString().should.equal(target);
    });
  });

  describe('.from', () => {
    it('should parse a string and return a Message object', () => {
      const data = `MESSAGE
destination:/topic/crusaders-quest
publisher:CLIENT_TRANSPORT

{"senderPublicId":"cf0fbd9155ef688e5548e6d1d38dd3aab356362d","senderNickName":"Foo","anchorUsername":"","content":"@Bar Baz!","date":"1485435703926","eventType":"CHAT_MESSAGE","payload":{"replyPublicIds":["3cdce7db4055021cdb90a05e4131740d847eff2c"]}}`;
      const message = Message.from(data);
      message.should.be.an('object');
      message.should.be.an.instanceof(Message);
      message.should.deep.equal({
        type: Message.types.message,
        attributes: {
          destination: '/topic/crusaders-quest',
          publisher: Message.publishers.clientTransport
        },
        payload: {
          senderPublicId: 'cf0fbd9155ef688e5548e6d1d38dd3aab356362d',
          senderNickName: 'Foo',
          anchorUsername: '',
          content: '@Bar Baz!',
          date: '1485435703926',
          eventType: 'CHAT_MESSAGE',
          payload: {replyPublicIds: ['3cdce7db4055021cdb90a05e4131740d847eff2c']}
        }
      });
    });
  });
});
