const amqp = require('amqplib');

let channel;

async function connect() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await conn.createChannel();
    console.log('RabbitMQ connected');
  } catch (e) {
    setTimeout(connect, 5000);
  }
}

async function publish(queue, data) {
  if (!channel) return;
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
}

connect();

module.exports = { publish };
