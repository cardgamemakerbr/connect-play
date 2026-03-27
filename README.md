# CONNECT-PLAY vs 1.2.1

---

# Connect Play

Plataforma de gerenciamento de torneios de jogos. Suporta múltiplos formatos de torneio, inscrição de jogadores, registro de partidas, comunicação entre participantes e premiação com troféus e medalhas.

---

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Como executar](#como-executar)
- [Usuário admin inicial (seed)](#usuário-admin-inicial-seed)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Modelos de dados](#modelos-de-dados)
- [API REST](#api-rest)
- [Controle de acesso](#controle-de-acesso)
- [Mensageria (RabbitMQ)](#mensageria-rabbitmq)
- [Frontend](#frontend)
- [Segurança](#segurança)

---

## Tecnologias

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Backend     | Node.js + Express                 |
| Banco       | MongoDB (Mongoose)                |
| Auth        | JWT (JSON Web Tokens) + bcryptjs  |
| Mensageria  | RabbitMQ (amqplib)                |
| Frontend    | React + React Router v6 + Axios   |
| Deploy      | Docker + docker-compose           |

---

## Arquitetura

```
connect-play/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js               # Entry point, registra rotas
│       ├── middlewares/
│       │   └── auth.js            # Middleware JWT com controle de roles
│       ├── models/
│       │   ├── User.js
│       │   ├── Tournament.js
│       │   ├── Match.js
│       │   ├── Message.js
│       │   └── Trophy.js
│       ├── routes/
│       │   ├── auth.js            # /api/auth
│       │   ├── users.js           # /api/users
│       │   ├── tournaments.js     # /api/tournaments
│       │   ├── matches.js         # /api/matches
│       │   ├── messages.js        # /api/messages
│       │   └── trophies.js        # /api/trophies
│       └── services/
│           └── rabbitmq.js        # Conexão e publicação de eventos
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.jsx                # Rotas e PrivateRoute
        ├── index.jsx
        ├── services/
        │   └── api.js             # Axios com interceptor de token
        ├── components/
        │   └── Navbar.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Tournaments.jsx
            ├── TournamentDetail.jsx
            ├── Matches.jsx
            ├── Profile.jsx
            └── AdminUsers.jsx
```

> O arquivo `backend/seed.js` não faz parte da estrutura de runtime — é executado manualmente uma única vez para criar o usuário admin.

---

## Como executar

### Pré-requisitos

- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.

### Subir todos os serviços

```bash
docker-compose up --build
```

| Serviço           | URL                              |
|-------------------|----------------------------------|
| Frontend          | http://localhost:3000            |
| Backend API       | http://localhost:3001/api        |
| MongoDB           | mongodb://localhost:27017        |
| RabbitMQ Console  | http://localhost:15672           |

> Credenciais padrão do RabbitMQ Management: `guest` / `guest`

### Desenvolvimento local (sem Docker)

**Backend:**
```bash
cd backend
npm install
MONGO_URI=mongodb://localhost:27017/connectplay JWT_SECRET=secret RABBITMQ_URL=amqp://localhost npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## Usuário admin inicial (seed)

O projeto não cria usuários automaticamente. Para criar o usuário `admin` inicial, execute o script de seed **após** os serviços estarem no ar:

```bash
# Com Docker
docker-compose exec backend npm run seed

# Local
cd backend
npm run seed
```

Credenciais padrão criadas pelo seed:

| Campo  | Valor       |
|--------|-------------|
| login  | `admin`     |
| senha  | `admin123`  |
| role   | `admin`     |

> Troque a senha imediatamente após o primeiro login em ambiente de produção.

O script é idempotente: se o usuário `admin` já existir, ele encerra sem criar duplicata.

---

## Variáveis de ambiente

Definidas no `docker-compose.yml` para o serviço `backend`:

| Variável        | Descrição                          | Valor padrão                          |
|-----------------|------------------------------------|---------------------------------------|
| `MONGO_URI`     | String de conexão com o MongoDB    | `mongodb://mongo:27017/connectplay`   |
| `JWT_SECRET`    | Chave secreta para assinar tokens  | `supersecret`                         |
| `RABBITMQ_URL`  | URL de conexão com o RabbitMQ      | `amqp://rabbitmq`                     |

> Em produção, substitua `JWT_SECRET` por um valor seguro e use variáveis de ambiente externas ao `docker-compose.yml`. Nunca exponha credenciais no código-fonte.

---

## Modelos de dados

### User

| Campo      | Tipo       | Obrigatório | Descrição                              |
|------------|------------|-------------|----------------------------------------|
| `name`     | String     | Sim         | Nome completo                          |
| `email`    | String     | Sim         | E-mail único                           |
| `login`    | String     | Sim         | Login único                            |
| `password` | String     | Sim         | Senha com hash bcrypt                  |
| `role`     | String     | —           | `player` (padrão), `organizer`, `admin`|
| `trophies` | ObjectId[] | —           | Referências para Trophy                |

### Tournament

| Campo             | Tipo       | Obrigatório | Descrição                                                                                      |
|-------------------|------------|-------------|------------------------------------------------------------------------------------------------|
| `name`            | String     | Sim         | Nome do torneio                                                                                |
| `type`            | String     | Sim         | `single_elimination`, `double_elimination`, `swiss`, `round_robin`, `draft`, `sealed`, `ladder`|
| `startDate`       | Date       | —           | Data de início                                                                                 |
| `endDate`         | Date       | —           | Data de término                                                                                |
| `maxParticipants` | Number     | —           | Limite de participantes                                                                        |
| `status`          | String     | —           | `open` (padrão), `ongoing`, `closed`                                                           |
| `organizer`       | ObjectId   | —           | Referência para User                                                                           |
| `participants`    | ObjectId[] | —           | Lista de jogadores inscritos                                                                   |

### Match

| Campo         | Tipo     | Obrigatório | Descrição                          |
|---------------|----------|-------------|------------------------------------|
| `tournament`  | ObjectId | Sim         | Torneio ao qual pertence           |
| `playerA`     | ObjectId | Sim         | Jogador A                          |
| `playerB`     | ObjectId | Sim         | Jogador B                          |
| `winner`      | ObjectId | —           | Vencedor da partida                |
| `scheduledAt` | Date     | —           | Data/hora agendada                 |
| `round`       | Number   | —           | Número da rodada                   |
| `status`      | String   | —           | `scheduled` (padrão), `completed`  |

### Message

| Campo        | Tipo     | Obrigatório | Descrição                        |
|--------------|----------|-------------|----------------------------------|
| `tournament` | ObjectId | —           | Torneio relacionado              |
| `from`       | ObjectId | Sim         | Remetente (User)                 |
| `to`         | ObjectId | —           | Destinatário (User) — opcional   |
| `content`    | String   | Sim         | Conteúdo da mensagem             |

### Trophy

| Campo       | Tipo     | Obrigatório | Descrição                    |
|-------------|----------|-------------|------------------------------|
| `name`      | String   | Sim         | Nome do troféu/medalha       |
| `description`| String  | —           | Descrição                    |
| `type`      | String   | —           | `trophy` (padrão), `medal`   |
| `tournament`| ObjectId | —           | Torneio de origem            |
| `awardedTo` | ObjectId | —           | Jogador premiado             |

---

## API REST

### Autenticação — `/api/auth`

| Método | Rota        | Auth | Descrição              |
|--------|-------------|------|------------------------|
| POST   | `/register` | —    | Cria novo usuário      |
| POST   | `/login`    | —    | Retorna token JWT      |

**POST /api/auth/register**
```json
// Request
{
  "name": "Rafael",
  "email": "rafael@email.com",
  "login": "rafael",
  "password": "123456"
}
// Nota: o campo "role" é ignorado — todo novo usuário é criado como "player".
// Somente um admin pode promover usuários via PUT /api/users/:id/role.

// Response 201
{
  "id": "<id>",
  "login": "rafael",
  "role": "player"
}
```

**POST /api/auth/login**
```json
// Request
{ "login": "rafael", "password": "123456" }

// Response 200
{ "token": "<jwt>", "role": "player" }
```

---

### Usuários — `/api/users`

| Método | Rota         | Auth         | Descrição                        |
|--------|--------------|--------------|----------------------------------|
| GET    | `/`          | admin        | Lista todos os usuários          |
| GET    | `/me`        | autenticado  | Retorna perfil do usuário logado |
| PUT    | `/:id/role`  | admin        | Altera o papel de um usuário     |
| DELETE | `/:id`       | admin        | Remove um usuário                |

---

### Torneios — `/api/tournaments`

| Método | Rota         | Auth              | Descrição                          |
|--------|--------------|-------------------|------------------------------------|
| GET    | `/`          | —                 | Lista todos os torneios            |
| POST   | `/`          | admin, organizer  | Cria um torneio                    |
| PUT    | `/:id`       | admin, organizer  | Atualiza um torneio                |
| DELETE | `/:id`       | admin, organizer  | Remove um torneio                  |
| POST   | `/:id/join`  | autenticado       | Inscreve o jogador no torneio      |

**POST /api/tournaments**
```json
// Request
{
  "name": "Copa Connect Play",
  "type": "swiss",
  "startDate": "2025-08-01",
  "endDate": "2025-08-03",
  "maxParticipants": 32
}
```

**POST /api/tournaments/:id/join**

Validações aplicadas:
- Torneio deve estar com `status: "open"`
- Jogador não pode estar já inscrito
- Número de participantes não pode exceder `maxParticipants`

---

### Partidas — `/api/matches`

| Método | Rota                        | Auth             | Descrição                        |
|--------|-----------------------------|------------------|----------------------------------|
| GET    | `/tournament/:tournamentId` | autenticado      | Lista partidas de um torneio     |
| POST   | `/`                         | admin, organizer | Cria/agenda uma partida          |
| PUT    | `/:id/result`               | admin, organizer | Registra o resultado da partida  |

**POST /api/matches**
```json
{
  "tournament": "<tournamentId>",
  "playerA": "<userId>",
  "playerB": "<userId>",
  "scheduledAt": "2025-08-01T14:00:00Z",
  "round": 1
}
```

**PUT /api/matches/:id/result**
```json
{ "winner": "<userId>" }
```

> Ao criar e ao registrar resultado de uma partida, eventos são publicados no RabbitMQ (ver seção [Mensageria](#mensageria-rabbitmq)).

---

### Mensagens — `/api/messages`

| Método | Rota                        | Auth        | Descrição                              |
|--------|-----------------------------|-------------|----------------------------------------|
| GET    | `/tournament/:tournamentId` | autenticado | Lista mensagens de um torneio          |
| POST   | `/`                         | autenticado | Envia uma mensagem                     |

**POST /api/messages**
```json
{
  "tournament": "<tournamentId>",
  "content": "Boa sorte a todos!",
  "to": "<userId>"   // opcional — omitir para mensagem geral no torneio
}
```

---

### Troféus e Medalhas — `/api/trophies`

| Método | Rota   | Auth             | Descrição                                    |
|--------|--------|------------------|----------------------------------------------|
| GET    | `/`    | autenticado      | Lista todos os troféus                       |
| POST   | `/`    | admin, organizer | Cria e opcionalmente atribui a um jogador    |
| DELETE | `/:id` | admin            | Remove um troféu                             |

**POST /api/trophies**
```json
{
  "name": "Campeão Suíço",
  "description": "Vencedor do torneio no formato Suíço",
  "type": "trophy",
  "tournament": "<tournamentId>",
  "awardedTo": "<userId>"
}
```

> Quando `awardedTo` é informado, o troféu é automaticamente adicionado ao array `trophies` do usuário.

---

## Controle de acesso

O middleware `auth.js` valida o token JWT no header `Authorization: Bearer <token>` e verifica o `role` do usuário.

| Role        | Permissões                                                                 |
|-------------|----------------------------------------------------------------------------|
| `player`    | Ver torneios, inscrever-se, ver partidas, enviar mensagens, ver perfil     |
| `organizer` | Tudo do player + criar/editar/excluir torneios, agendar partidas, premiar  |
| `admin`     | Tudo do organizer + gerenciar usuários, alterar roles, excluir troféus     |

---

## Mensageria (RabbitMQ)

O serviço `rabbitmq.js` conecta automaticamente ao broker com retry a cada 5 segundos em caso de falha.

### Filas publicadas

| Fila              | Quando é publicado              | Payload                                      |
|-------------------|---------------------------------|----------------------------------------------|
| `match.scheduled` | Ao criar uma nova partida       | `{ matchId, tournament, playerA, playerB, round }` |
| `match.result`    | Ao registrar resultado          | `{ matchId, winner }`                        |

As filas são declaradas como `durable: true`, garantindo persistência mesmo se o broker reiniciar.

> Para consumir os eventos (ex: enviar notificações), crie um consumer separado usando `amqplib` conectando às mesmas filas.

---

## Segurança

### Registro de usuários

O campo `role` enviado no body do `POST /api/auth/register` é **ignorado pelo backend**. Todo usuário registrado pelo endpoint público recebe automaticamente o papel `player`. A elevação de papel só pode ser feita por um `admin` via `PUT /api/users/:id/role`.

### Autenticação

- Senhas armazenadas com hash `bcrypt` (salt rounds: 10)
- Tokens JWT com expiração de 7 dias
- Token deve ser enviado no header: `Authorization: Bearer <token>`

### Recomendações para produção

| Item | Recomendação |
|------|--------------|
| `JWT_SECRET` | Use um valor longo e aleatório, nunca `supersecret` |
| Senha do admin | Troque `admin123` imediatamente após o primeiro login |
| HTTPS | Use um proxy reverso (nginx/traefik) com TLS |
| CORS | Configure origens permitidas explicitamente no Express |
| Rate limiting | Adicione `express-rate-limit` nas rotas de auth |
| Variáveis de ambiente | Use secrets manager (ex: AWS Secrets Manager) em produção |

---

## Frontend

### Páginas

| Rota                        | Componente          | Acesso       | Descrição                                  |
|-----------------------------|---------------------|--------------|--------------------------------------------|
| `/login`                    | Login               | Público      | Autenticação                               |
| `/register`                 | Register            | Público      | Cadastro de novo jogador                   |
| `/tournaments`              | Tournaments         | Autenticado  | Lista torneios, inscrição, criação         |
| `/tournaments/:id`          | TournamentDetail    | Autenticado  | Detalhes do torneio e chat                 |
| `/tournaments/:id/matches`  | Matches             | Autenticado  | Partidas e registro de resultados          |
| `/profile`                  | Profile             | Autenticado  | Perfil do jogador com troféus              |
| `/admin/users`              | AdminUsers          | Admin        | Gerenciamento de usuários e roles          |

### Autenticação no frontend

O token JWT é armazenado no `localStorage` e injetado automaticamente em todas as requisições via interceptor do Axios (`src/services/api.js`). Rotas protegidas usam o componente `PrivateRoute` que redireciona para `/login` caso não haja token.
