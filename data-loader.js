// loads sample data to DynamoDB table - amazon-product-alert-app
// Q) should this also provision the table if not exist?

const Bluebird = require('bluebird')
const sampleData = require('./_data/items').items
const AWS = require('aws-sdk')

AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

Bluebird.map(sampleData, async (item) => {
    const params = {
        TableName: 'amazon-product-alert-app',
        Item: {
            id: {
                S: item.id
            },
            name: {
                S: item.name
            },
            url: {
                S: item.url
            },
            priceThreshold: {
                N: `${item.priceThreshold}`     // even if the DynamoDB datatype is a Number, the value here must be a string
            },
            // itemLastAvailableDateTime: {
            //     S: formatISO(Date.now())        // 2020-04-03T18:10:17-07:00
            // }
        }
    }

    await dynamodb.putItem(params).promise()
}).then(() => {
    console.log('Done Loading Sample Data')
})











