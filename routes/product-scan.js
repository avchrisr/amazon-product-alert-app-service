const router = require('express-promise-router')();

const { run } = require('../controllers/product-scan')


// const {
//     getUsers,
//     getUser,
//     createUser,
//     updateUser,
//     deleteUser
// } = require('../controllers/users');

// const User = require('../models/User');
// const advancedQueryHandler = require('../middleware/advanced-query-handler');
// const { protectRoute, authorize } = require('../middleware/auth-handler');

// router.use(protectRoute);       // indicates that anything below this line will use the 'protectRoute' middleware
// router.use(authorize('admin')); // indicates that anything below this line will use the 'authorize' middleware

// router.route('/')
//     .get(advancedQueryHandler(User), getUsers)
//     .post(createUser);

// router.route('/:id')
//     .get(getUser)
//     .put(updateUser)
//     .delete(deleteUser);


router.route('/')
    .get(run)
    // .post(createUser);

module.exports = router;
