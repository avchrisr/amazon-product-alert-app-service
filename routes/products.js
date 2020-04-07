const router = require('express-promise-router')();

// ** 'mergeParams: true' is needed to include this products router in other routers (e.g. /categories/:categoryId/products)
// const router = express.Router({ mergeParams: true });

const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/products');

const searchQueryHandler = require('../middleware/search-query-handler');

router.route('/')
    .get(searchQueryHandler('products'), getProducts)
    // .post(protectRoute, authorize('publisher', 'admin'), createCourse);



/*
const Course = require('../models/Course');
const advancedQueryHandler = require('../middleware/advanced-query-handler');
const { protectRoute, authorize } = require('../middleware/auth-handler');

router.route('/')
    .get(advancedQueryHandler(Course, {
        path: 'bootcamp',
        select: 'name description'      // fetch only 'name' and 'description' fields
    }), getCourses)
    .post(protectRoute, authorize('publisher', 'admin'), createCourse);

router.route('/:id')
    .get(getCourse)
    .put(protectRoute, authorize('publisher', 'admin'), updateCourse)
    .delete(protectRoute, authorize('publisher', 'admin'), deleteCourse);

*/

module.exports = router;
