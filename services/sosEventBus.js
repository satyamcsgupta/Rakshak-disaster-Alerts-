const EventEmitter = require('events');

const sosEventBus = new EventEmitter();
sosEventBus.setMaxListeners(100);

const publishSOSEvent = (event) => {
  sosEventBus.emit('sos-event', {
    at: new Date().toISOString(),
    ...event
  });
};

module.exports = {
  sosEventBus,
  publishSOSEvent
};
