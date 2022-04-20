
# NFTicket-backend

## Configuration

On utilise le package `@nestjs/config` pour charger un fichier .env. [Tutoriel](https://docs.nestjs.com/techniques/configuration) sur comment avoir accès aux variables

## Variables nécessaires dans les variables d'environnement (fichier .env)

### URL Blockchain EOS

#### Variables pour déterminer l'URL de la node EOS et les paramètres

```bash
BLOCKCHAIN_NODE_URL # default Value: http://eos1.anthonybrochu.com:8888
CHAIN_ID # default Value: 5d5bbe6bb403e5ca8b087d382946807246b4dee094c7f5961e2bebd88f8c9c51
BLOCKCHAIN_TOKEN_SYMBOL # default value: SYS
BLOCKCHAIN_TRANSFER_CONTRACT_NAME # default value: eosio.token
BLOCKCHAIN_TOKEN_FIXED_PRECISION # default value: 4
APP_NAME # default Value: NFTicket
```

#### Variables pour la configuration Appwrite et le compte système pour EOS

```
TEMP_ACCOUNT_OWNER_ASSETS # Determine which account will hold the nft when they are created.
TEMP_ACCOUNT_OWNER_PUB_KEY # Public key of the temp account
TEMP_ACCOUNT_OWNER_PRIV_KEY # Private key of the owner of the created NFT's
APPWRITE_PROJECTID # Project Id of the appwrite project
APPWRITE_ENDPOINT # Endpoint of the appwrite instance
```


#### Variables pour déterminer les ID des collections Appwrite dans le fichier .appwrite.env

```bash
APPWRITE_COLLECTION_ID_TICKET_CATEGORIES
APPWRITE_COLLECTION_ID_TICKETS
APPWRITE_COLLECTION_ID_EOS_INFO
APPWRITE_COLLECTION_ID_EVENTS
APPWRITE_COLLECTION_ID_TICKET_CATEGORIES_STYLINGS
APPWRITE_COLLECTION_ID_TRANSACTIONS_PENDING
```

#### Variables pour le déboggage et l'analyse

```
PERFORMANCE_TRACE # For Debugging and analysing purpose, we can decide to log the executing time of choosen functions
```

## Description

Composante backend de NFTicket.

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
