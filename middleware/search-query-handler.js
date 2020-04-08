const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
});

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
});

const modelToTableMap = {
    products: 'amazon-product-alert-app'
}
const queryParamsMap = {
    name: ':productName'
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


    /*
        // // fields to exclude, so it won't be passed to mongoDB's find filter params
        // // this could be a global level constant variable
        // const excludeFields = ['select', 'sort', 'page', 'limit'];
        // excludeFields.forEach(param => delete reqQuery[param]);

        let queryStr = JSON.stringify(reqQuery);

        // prepend '$' on gt|gte|lt|lte|in that came from URL query parameters so they can be used for mongoDB's find filter
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        let dbQuery = model.find(JSON.parse(queryStr));

        // 'courses' name must match the virtuals name defined in the model schema
        // *** populate the ObjectID reference field with actual data ***
        if (populate) {
            dbQuery = dbQuery.populate(populate);
        }

        // SELECT fields to return, if 'select' query parameter was provided by bootcamp in the request
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            dbQuery = dbQuery.select(fields);       // '.select()' is a mongoose API, which only returns the selected fields + _id
        }

        // SORT
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            dbQuery = dbQuery.sort(sortBy);
        } else {
            // default sort
            dbQuery = dbQuery.sort('-createdAt');       // sort by 'createdAt' DESC
        }

        // PAGINATION and LIMIT
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await model.countDocuments();

        dbQuery = dbQuery.skip(startIndex).limit(limit);

        // execute dbQuery
        const results = await dbQuery;

        // Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            }
        }

        res.advancedQueryResults = {
            success: true,
            count: results.length,
            pagination,
            data: results
        };

        next();
    */

}

module.exports = searchQueryHandler
