class MiddlewareDone extends Error {}
class InvalidBotNickName extends Error {}
class ListenerNotFound extends Error {}

module.exports = {
  MiddlewareDone,
  InvalidBotNickName,
  ListenerNotFound
};
