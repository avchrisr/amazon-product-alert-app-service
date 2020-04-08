const router = require('express-promise-router')()

// ** 'mergeParams: true' is needed to include this products router in other routers (e.g. /categories/:categoryId/products)
// const router = express.Router({ mergeParams: true })

const {
    getProducts,
    getProduct,
    createOrUpdateProduct,
    deleteProduct
} = require('../controllers/products')

const searchQueryHandler = require('../middleware/search-query-handler')

router.route('/')
    .get(searchQueryHandler('products'), getProducts)
    .post(createOrUpdateProduct)
    // .post(protectRoute, authorize('publisher', 'admin'), createCourse);

router.route('/:productId')
    .get(getProduct)
    .put(createOrUpdateProduct)
    .delete(deleteProduct)
    // .delete(protectRoute, authorize('publisher', 'admin'), deleteCourse);


/*
const Course = require('../models/Course');
const advancedQueryHandler = require('../middleware/advanced-query-handler');
const { protectRoute, authorize } = require('../middleware/auth-handler');
*/

module.exports = router
