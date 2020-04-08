const router = require('express-promise-router')()

const {
    getPhoneNumber,
    registerPhoneNumber,
    confirmPhoneNumber,
    deletePhoneNumber
} = require('../controllers/phone-numbers')

// const searchQueryHandler = require('../middleware/search-query-handler')

router.route('/registration')
    // .get(searchQueryHandler('products'), getProducts)
    .post(registerPhoneNumber)
    // .post(protectRoute, authorize('publisher', 'admin'), createCourse);

router.route('/confirmation')
    // .get(searchQueryHandler('products'), getProducts)
    .post(confirmPhoneNumber)
    // .post(protectRoute, authorize('publisher', 'admin'), createCourse);

router.route('/:phoneNumber')
    .get(getPhoneNumber)
    .put(registerPhoneNumber)
    .delete(deletePhoneNumber)
    // .delete(protectRoute, authorize('publisher', 'admin'), deleteCourse);

module.exports = router
