// -----------------
// CRUD of products
// -----------------

// @route       GET /api/v1/products
// @access      Public
const getProducts = async (req, res, next) => {
    res.status(200).json(res.searchQueryResults)
}

// @route       GET /api/v1/products/:productId
// @access      Public
const getProduct = async (req, res, next) => {



    // const user = await Course.findById(req.params.id);
    // if (!user) {
    //     next(new ErrorResponse(`Course not found with id = ${req.params.id}`, 404));
    //     return;
    // }
    // res.status(200).json({
    //     success: true,
    //     data: user
    // });
}






/*
const Course = require('../models/Course');
const ErrorResponse = require('../utils/ErrorResponse');
const asyncHandler = require('../middleware/async-handler');

// @route       GET /api/v1/courses
// @route       GET /api/v1/bootcamps/:bootcampId/courses
// @access      Public
const getCourses = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedQueryResults);
});

const getCourse = asyncHandler(async (req, res, next) => {
    const user = await Course.findById(req.params.id);
    if (!user) {
        next(new ErrorResponse(`Course not found with id = ${req.params.id}`, 404));
        return;
    }
    res.status(200).json({
        success: true,
        data: user
    });
});

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


