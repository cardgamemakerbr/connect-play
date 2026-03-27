const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/connectplay';

const ADMIN = {
  name: 'Administrador',
  email: 'admin@connectplay.com',
  login: 'admin',
  password: 'admin123',
  role: 'admin',
};

async function seed() {
  await mongoose.connect(MONGO_URI);

  const exists = await User.findOne({ login: ADMIN.login });
  if (exists) {
    console.log('Usuário admin já existe.');
    process.exit(0);
  }

  const hash = await bcrypt.hash(ADMIN.password, 10);
  await User.create({ ...ADMIN, password: hash });

  console.log('Usuário admin criado com sucesso!');
  console.log(`  login: ${ADMIN.login}`);
  console.log(`  senha: ${ADMIN.password}`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
