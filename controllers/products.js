// -----------------
// CRUD of products
// -----------------
const _ = require('lodash')
const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk')

AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

const dynamodbTableName = 'amazon-product-alert-app'

// @route       GET /api/v1/products
// @access      Public
const getProducts = async (req, res, next) => {
    res.status(200).json(res.searchQueryResults)
}

// @route       GET /api/v1/products/:productId
// @access      Public
const getProduct = async (req, res, next) => {
    const params = {
        TableName: dynamodbTableName,
        Key: {      // must provide all attributes. if sort key exists, must provide it
            id: {
                S: req.params.productId
            }
        }
    }

    // if no matching item found, it returns an empty object {}
    const results = await dynamodb.getItem(params).promise()

    console.log('----------   results   ---------')
    console.log(JSON.stringify(results, null, 4))

    if (!results.Item) {
        throw new ErrorResponse(`Product not found with id = ${req.params.productId}`, 404)
    }

    res.status(200).json({
        success: true,
        data: results.Item
    })
}

const createOrUpdateProduct = async (req, res, next) => {
    const priceThreshold = _.get(req, 'body.priceThreshold', -1)
    const params = {
        TableName: dynamodbTableName,
        Item: {
            id: {
                S: req.body.id
            },
            name: {
                S: req.body.name
            },
            url: {
                S: req.body.url
            },
            priceThreshold: {
                N: `${priceThreshold}`     // even if the DynamoDB datatype is a Number, the value here must be a string
            },
            // itemLastAvailableDateTime: {
            //     S: formatISO(Date.now())        // 2020-04-03T18:10:17-07:00
            // }
        }
    }

    const results = await dynamodb.putItem(params).promise()

    res.status(201).json({
        success: true,
        data: results
    })
}

const deleteProduct = async (req, res, next) => {
    const params = {
        TableName: dynamodbTableName,
        Key: {     // must provide all attributes. if sort key exists, must provide it
            id: {
                S: req.params.productId
            }
        },
        // ConditionExpression: 'attribute_not_exists(id)'
    }

    // If no matching item found by ID (primary key), DynamoDB will still return a success empty object {}
    const results = dynamodb.deleteItem(params).promise()

    res.status(200).json({
        success: true,
        data: results
    })
}

module.exports = {
    getProducts,
    getProduct,
    createOrUpdateProduct,
    deleteProduct
}
