const Promise = require('bluebird');
const {MiddlewareDone} = require('./errors');

class Middleware {
  constructor() {
    this.middlewares = [];
  }

  execute(context) {
    return Promise.each(this.middlewares, middleware => {
      return new Promise(resolve => {
        middleware(context, resolve, () => {
          throw new MiddlewareDone();
        });
      });
    })
    .then(() => context);
  }

  /**
   * Register a middleware
   * @param {Middleware~middleware} middleware
   */
  register(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * A bot middleware
   * @callback Middleware~middleware
   * @param context
   * @param next
   * @param done
   */
}

module.exports = Middleware;
