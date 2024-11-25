const express = require("express");
const router = express.Router();
const admincontroller = require('../controllers/admincontroller')
const tourcontroller = require('../controllers/tourcontroller')
const upload = require('../config/multer')


// login route
router.get("/login",admincontroller.admingetlogin);
router.get("/",admincontroller.adminhome);
router.post("/login",admincontroller.adminlogin);
router.post("/register",admincontroller.register);
router.post('/logout', admincontroller.logout)

// category details
router.get("/addcategory",admincontroller.addcategory);
router.post("/categories",admincontroller.postaddCategory );
router.put("/categories/:id",admincontroller.editCategory );
router.get("/allcategory",admincontroller.allcategory);
router.delete("/deletecategory/:id",admincontroller.deleteCategory);

// tour details
router.post('/tours', upload.array('images', 5), tourcontroller.addTour); // 'images' is the field name in the form
 //get edit tour
router.get('/tours/:id',tourcontroller.geteditTour);
// Edit a tour
router.put('/tours/:id',upload.array('images', 5),tourcontroller.editTour);
// Delete a tour
router.delete('/tours/:id',tourcontroller.deleteTour);
// Get all tours
router.get('/tours',tourcontroller.getAllTours);
router.get("/alltour",admincontroller.alltours);
router.get("/addtour",admincontroller.addtour);

router.delete('/img/:id',tourcontroller.deletePerImage)


// categorywise
router.get('/tours/:categoryId',tourcontroller.getCategoryWiseTours);
// blog details
router.post('/blog', upload.array('images', 5), tourcontroller.addBlog); // 'images' is the field name in the form
router.get('/blogs/:id',tourcontroller.geteditblog); 
router.put('/blogs/:id', upload.array('images',5), tourcontroller.editBlog);
router.delete('/blogs/:id', tourcontroller.deleteBlog);
router.get('/blog',admincontroller.getblogpage)
router.get('/allblog',tourcontroller.allblogs)


module.exports= router