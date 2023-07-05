# PDF-Store Service (NestJS/MongoDB)

## Build & Run the App (prod/docker)

- clone the repository to your local
- in `./pdf-store` follow next steps
- create `.env.production` from `.env.example`
- set the value for `SESSION_SECRET`
- configure the `volumes` in `docker-compose.yml` (mongodb data directory and pdf-storage directory)
- run `docker-compose up` to build and run the containers
- navigate to `http://localhost:3000/login` (use `admin@tmp.com` for the email and password)

## Running the App (dev)

```bash
# install deps
$ npm install

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```
