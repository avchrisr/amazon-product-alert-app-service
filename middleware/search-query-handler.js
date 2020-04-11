const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-2'
});

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
});

const modelToTableMap = {
    products: 'amazon-product-alert-app'
}
const queryParamsMap = {
    name: ':productName',
    phoneNumber: ':phoneNumber'
}

const scanItems = async (model, reqQuery) => {

    console.log('----------   reqQuery   ---------')
    console.log(JSON.stringify(reqQuery, null, 4))

    if (!model || !modelToTableMap[model]) {
        throw new ErrorResponse(`search-query-handler | scanItems - model is not valid = ${model}`, 400)
    }

    const params = {
        TableName: modelToTableMap[model],
        // FilterExpression: 'contains(#productName, :productName)',   // filter to apply AFTER scanning all items first

        // ExpressionAttributeValues: { ':avail': { S: 'Available'}, ':backordered': { S: 'Backordered'} },
        // FilterExpression: 'productStatus IN (:avail, :backordered)',   // filter to apply AFTER scanning all items first

        // ProjectionExpression: "LastPostDateTime, Message, Tags",    // JSON property fields you want to retrieve. If not specified, all are returned
        // Select: 'COUNT',               // only get the counts, no items are returned
        // ConsistentRead: true,             // false by default
        // ReturnConsumedCapacity: 'TOTAL'   // response includes metadata about consumed capacity for that transaction
    }

    if (reqQuery.name) {
        params.ExpressionAttributeNames = {
            '#productName': 'name'
        }
        params.FilterExpression = '#productName = :productName'     // filter to apply AFTER scanning all items first
        params.ExpressionAttributeValues = {
            [queryParamsMap.name]: {
                S: reqQuery.name
            }
        }
    }

    if (reqQuery.phoneNumber) {
        params.ExpressionAttributeNames = {
            '#phoneNumber': 'phoneNumber'
        }
        params.FilterExpression = '#phoneNumber = :phoneNumber'     // filter to apply AFTER scanning all items first
        params.ExpressionAttributeValues = {
            [queryParamsMap.phoneNumber]: {
                S: reqQuery.phoneNumber
            }
        }
    }

    return await dynamodb.scan(params).promise()
}

const searchQueryHandler = (model) => async (req, res, next) => {
    // print query parameters
    // console.log(req.query);

    // copy req.query
    const reqQuery = { ...req.query }

    const results = await scanItems(model, reqQuery)

    console.log('----------   results   ---------')
    console.log(JSON.stringify(results, null, 4))

    res.searchQueryResults = {
        success: true,
        count: results.Count,
        data: results
    }

    next()
}

module.exports = searchQueryHandler
