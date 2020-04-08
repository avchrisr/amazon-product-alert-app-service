// -----------------
// CRUD of products
// -----------------
const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk')

AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

// @route       GET /api/v1/products
// @access      Public
const getProducts = async (req, res, next) => {
    res.status(200).json(res.searchQueryResults)
}

// @route       GET /api/v1/products/:productId
// @access      Public
const getProduct = async (req, res, next) => {
    const params = {
        TableName: 'amazon-product-alert-app',
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



/*
const Course = require('../models/Course');
const ErrorResponse = require('../utils/ErrorResponse');
const asyncHandler = require('../middleware/async-handler');

const createCourse = asyncHandler(async (req, res, next) => {
    const user = await Course.create(req.body);
    res.status(201).json({
        success: true,
        data: user
    });
});

const updateCourse = asyncHandler(async (req, res, next) => {
    const user = await Course.findByIdAndUpdate(req.params.id, req.body, {
        new: true,       // when we get the data, we want the returned user to be the newly updated user
        runValidators: true
    });
    if (!user) {
        next(new ErrorResponse(`Course not found with id = ${req.params.id}`, 404));
        return;
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

const deleteCourse = asyncHandler(async (req, res, next) => {
    const user = await Course.findByIdAndDelete(req.params.id);
    if (!user) {
        next(new ErrorResponse(`Course not found with id = ${req.params.id}`, 404));
        return;
    }

    res.status(200).json({
        success: true,
        data: {}
    });
});
*/

module.exports = {
    getProducts,
    getProduct,
    // createProduct,
    // updateProduct,
    // deleteProduct
};


