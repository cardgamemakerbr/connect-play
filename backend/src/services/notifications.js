const Notification = require('../models/Notification');

async function notify(users, type, title, body, link) {
  const ids = Array.isArray(users) ? users : [users];
  const docs = ids.filter(Boolean).map(user => ({ user, type, title, body, link }));
  if (docs.length) await Notification.insertMany(docs);
}

module.exports = { notify };
