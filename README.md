# amazon-product-alert-app-service
Amazon Product Alert App - Service

[Amazon Product Alert App](www.chrisro.tech)

Monitors user-specified Amazon products, and sends SMS text alerts if product is available under user's max price threshold

## Technical Design Architecture
- express.js (REST-API)
- socket.io (WebSocket)
  - two-way live communication between server and client browser
- dynamoDB
  - main datastore
- SNS SMS messaging
  - sending texts

## Initialization Steps

1. Modify `_data/items.json` with the product name, url, max price (optional) you want to watch. You can run it by using following command:
```
node data-loader.js
```

2. Create a `config/.env` file with the following properties. Example values shown below:

```
NODE_ENV=development
APP_PORT=5000

AWS_ACCESS_KEY_ID=MY_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=MY_SECRET_ACCESS_KEY
AWS_REGION=us-west-2
```

3. Run it
```
   node server.js
```

* You can also run `nodemon server.js` or `npm run dev` to watch for any changes during development, and automatically restart the server
