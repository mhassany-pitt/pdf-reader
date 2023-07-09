# PDF-Reader Docker

## Run the App

- clone the codebase: _`git clone https://github.com/mhassany-pitt/pdf-reader.git`_
- in _`./docker`_, create _`.env.production`_

```bash
PORT=3000
STORAGE_PATH=./storage
MONGO_URI=mongodb://mongodb:27017/pdf-store
SESSION_SECRET=<<REPLACE THIS TEXT WITH A SECRET>>
```

- run _`docker-compose up`_ to spin up the containers
- navigate to _`http://localhost:3000/#/login`_ (use _`admin@tmp.com`_ for the email and password)
