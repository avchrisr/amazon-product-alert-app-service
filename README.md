# amazon-product-alert-app-service
Amazon Product Alert App - Service

Monitors Amazon products specified in `_data/items.json`, and sends Email and SMS text alerts if product is available

**Pre-requisite**

Requires an Amazon account

## Initialization Steps

1. Modify `_data/items.json` with the name and url of products you want to watch
2. Create a .env file with the following properties

```
NODE_ENV=development
APP_PORT=5000

AWS_REGION=us-west-2

RECIPIENT_PHONE_NUMBER=19492225555
```

3. Run it
```
   node amazon-product-alert.js
```
