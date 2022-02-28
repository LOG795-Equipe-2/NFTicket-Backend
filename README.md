
# NFTicket-backend

## Configuration

On utilise le package `@nestjs/config` pour charger un fichier .env. [Tutoriel](https://docs.nestjs.com/techniques/configuration) sur comment avor accès aux variables

Variables nécessaire dans le fichier .env
```bash
MONGO_URI # lien vers la BD Mongo
```

### URL Blockchain EOS

Variables pour déterminer l'URL de la node EOS dans le fichier .env
```bash
BLOCKCHAIN_NODE_URL # default Value: http://eos1.anthonybrochu.com:8888
CHAIN_ID # default Value: 5d5bbe6bb403e5ca8b087d382946807246b4dee094c7f5961e2bebd88f8c9c51
APP_NAME # default Value: NFTicket
TEMP_ACCOUNT_OWNER_ASSETS # Determine which account will hold the nft when they are created.
```

## Description

Composante backend de NFTicket

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```


## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
