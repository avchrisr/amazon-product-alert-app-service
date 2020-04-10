# amazon-product-alert-app-service
Amazon Product Alert App - Service

Monitors Amazon products specified in `_data/items.json`, and sends SMS text alerts if product is available

**Pre-requisite**

Requires an AWS account

## Initialization Steps

1. Modify `_data/items.json` with the name and url of products you want to watch
2. Create a `config/.env` file with the following properties. Example values shown below:

```
NODE_ENV=development
APP_PORT=5000

AWS_ACCESS_KEY_ID=XXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXX
AWS_REGION=us-west-2
```

3. Run it
```
   node server.js
```

* You can also run `nodemon server.js` or `npm run dev` to watch for any changes during development, and automatically restart the server