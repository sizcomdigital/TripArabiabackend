const Tour = require("../models/tourmodel");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Blog = require("../models/blogmodel");
const crypto = require("crypto");
const Category = require("../models/categorymodel");
const mongoose = require("mongoose");

module.exports = {
  addTour: async (req, res) => {
    console.log(req.body, req.files);

    const {
      tourName,
      category,
      hoursOfTrip,
      tripTime,
      actualPrice,
      offerPrice,
      locationName,
      description,
    } = req.body;

    // Parse the fields that should be arrays
    const included = JSON.parse(req.body.included || "[]");
    const excluded = JSON.parse(req.body.excluded || "[]");
    const tourHighlights = JSON.parse(req.body.tourHighlights || "[]");

    try {
      // Validate `tripTime` and convert 24-hour to 12-hour format if needed
      let parsedTripTime =
        typeof tripTime === "object" && tripTime !== null
          ? tripTime
          : JSON.parse(tripTime || "{}");

      let { from, to } = parsedTripTime;

      // Convert 24-hour time to 12-hour format (if needed)
      const convertTo12HourFormat = (time24) => {
        let [hours, minutes] = time24.split(":");
        hours = parseInt(hours, 10);
        let period = hours >= 12 ? "PM" : "AM";
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12; // Midnight edge case
        return `${hours}:${minutes} ${period}`;
      };

      from = convertTo12HourFormat(from);
      to = convertTo12HourFormat(to);

      // Validate time format using regex for 12-hour format
      const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
      if (!timeRegex.test(from) || !timeRegex.test(to)) {
        return res
          .status(400)
          .json({ message: "Invalid time format. Use 8:00 AM format." });
      }

      // Handle image uploads
      const localImagePaths = [];
      console.log(req.files);
      // const cloudinaryImageUrls = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          // Save local paths
          localImagePaths.push(file.filename);

          // Upload to Cloudinary
          // const cloudinaryResponse = await cloudinary.uploader.upload(
          //   file.path,
          //   {
          //     folder: "tour", // Optional: Create a folder named 'blogs' in Cloudinary
          //   }
          // );

          // cloudinaryImageUrls.push(cloudinaryResponse.secure_url);
        }
      }

      // Check if a tour with the same name and category exists
      const existingTour = await Tour.findOne({ tourName, category });
      if (existingTour) {
        return res
          .status(400)
          .json({
            message: "A tour with this name and category already exists.",
          });
      }

      // Create the new tour
      const newTour = new Tour({
        tourName,
        category,
        hoursOfTrip,
        tripTime: { from, to },
        actualPrice,
        offerPrice,
        locationName,
        description,
        included,
        excluded,
        tourHighlights,
        images: localImagePaths,
      });

      // Save the tour to the database
      await newTour.save();
      const hash = crypto.createHash("sha256");
      hash.update(newTour._id.toString()); // Convert ObjectId to string
      const hashedId = hash.digest("hex").slice(0, 6);
      newTour.hashedId = hashedId;

      await newTour.save();

      res
        .status(201)
        .json({ message: "Tour added successfully", tour: newTour });
    } catch (error) {
      console.error("Error adding tour:", error);
      res
        .status(400)
        .json({ message: "Error adding tour", error: error.message });
    }
  },


   editTour : async (req, res) => {
    const { id } = req.params;
  
    try {
      // Find the existing tour by ID
      const existingTour = await Tour.findById(id);
      if (!existingTour) {
        return res.status(404).json({ message: "Tour not found" });
      }
  
      // Prepare the updated data from the request body
      const updatedData = { 
        ...req.body,
        updatedAt: Date.now(),
      };
  
      // Convert fields like included, excluded, and tourHighlights from comma-separated strings to arrays
      if (updatedData.included && typeof updatedData.included === 'string') {
        updatedData.included = updatedData.included.split(',').map(item => item.trim());
      }
  
      if (updatedData.excluded && typeof updatedData.excluded === 'string') {
        updatedData.excluded = updatedData.excluded.split(',').map(item => item.trim());
      }
  
      if (updatedData.tourHighlights && typeof updatedData.tourHighlights === 'string') {
        updatedData.tourHighlights = updatedData.tourHighlights.split(',').map(item => item.trim());
      }
 
  
      // Handle image uploads to Cloudinary
      const localImagePaths = [];
      const cloudinaryImageUrls = [];
  
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          // Save local paths temporarily (if needed for deletion or backup)
          localImagePaths.push(file.filename);
  
          // Upload the file to Cloudinary
          const cloudinaryResponse = await cloudinary.uploader.upload(
            file.path,
            {
              folder: "tour", // Optional: Upload to 'tour' folder in Cloudinary
            }
          );
  
          // Push the Cloudinary URL to the list of uploaded image URLs
          cloudinaryImageUrls.push(cloudinaryResponse.secure_url);
        }
  
        // Combine the new Cloudinary image URLs with the existing ones (without duplicates)
        updatedData.images = [...new Set([...existingTour.images, ...localImagePaths])];
      } else {
        // If no new images are provided, keep the existing images
        updatedData.images = existingTour.images;
      }
  
      // Update the tour with the new data, including images and other fields
      const updatedTour = await Tour.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
  
      // Return success response with the updated tour data
      return res.status(200).json({ message: "Tour updated successfully", tour: updatedTour });
  
    } catch (error) {
      // Handle any errors during the update process
      console.error(error);
      return res.status(400).json({ message: "Error updating tour", error: error.message });
    }
  }
  ,



  deleteTour: async (req, res) => {
    const { id } = req.params;

    try {
      const deletedTour = await Tour.findByIdAndDelete(id);

      if (!deletedTour) {
        return res.status(404).json({ message: "Tour not found" });
      }

      res
        .status(200)
        .json({ message: "Tour deleted successfully", tour: deletedTour });
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error deleting tour", error: error.message });
    }
  },
  getAllTours: async (req, res) => {
    try {
      const tours = await Tour.find().populate("category", "name");
      res.status(200).json({ message: "Tours fetched successfully", tours });
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error fetching tours", error: error.message });
    }
  },
  getCategoryWiseTours: async (req, res) => {
    const { categoryId } = req.params;

    try {
      // Find tours that match the specified category
      const tours = await Tour.find({ category: categoryId })
        .populate("category", "name") // Populating the category to include its name
        .exec();

      if (tours.length === 0) {
        return res
          .status(404)
          .json({ message: "No tours found for this category" });
      }

      res.status(200).json({ message: "Tours fetched successfully", tours });
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error fetching tours", error: error.message });
    }
  },
  addBlog: async (req, res) => {
    console.log(req.body);

    const { blogName, description, miniDescription } = req.body;

    try {
      // Validate required fields
      if (!blogName || !description || !miniDescription) {
        return res
          .status(400)
          .json({ message: "All fields are required except images." });
      }

      // Handle image uploads
      const localImagePaths = [];
      const cloudinaryImageUrls = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          // Save local paths
          localImagePaths.push(file.filename);

          // Upload to Cloudinary
          const cloudinaryResponse = await cloudinary.uploader.upload(
            file.path,
            {
              folder: "blogs", // Optional: Create a folder named 'blogs' in Cloudinary
            }
          );
          cloudinaryImageUrls.push(cloudinaryResponse.secure_url);
        }
      }

      // Create a new blog entry
      const newBlog = new Blog({
        blogName,
        description,
        miniDescription,
        images: localImagePaths,
      });

      await newBlog.save();

      res
        .status(201)
        .json({ message: "Blog added successfully", blog: newBlog });
    } catch (error) {
      console.error("Error adding blog:", error);
      res
        .status(500)
        .json({ message: "Failed to add blog", error: error.message });
    }
  },
  editBlog: async (req, res) => {
    const { id } = req.params;
    const { blogName, description, miniDescription } = req.body;

    try {
      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }

      // Update fields
      blog.blogName = blogName || blog.blogName;
      blog.description = description || blog.description;
      blog.miniDescription = miniDescription || blog.miniDescription;

      // Handle new image uploads if any
      if (req.files && req.files.length > 0) {
        const imageUrls = [];
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "blogs",
          });
          imageUrls.push(result.secure_url);
        }
        blog.images = imageUrls; // Replace the old images
      }

      await blog.save();
      res.status(200).json({ message: "Blog updated successfully", blog });
    } catch (error) {
      console.error("Error updating blog:", error);
      res
        .status(500)
        .json({ message: "Failed to update blog", error: error.message });
    }
  },
  // Delete a blog post

  deleteBlog: async (req, res) => {
    console.log(req.params.id);

    const { id } = req.params;

    try {
      const blog = await Blog.findById(id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }
      // // Optional: Delete images from Cloudinary
      // for (const imageUrl of blog.images) {
      //   const publicId = imageUrl.split('/').pop().split('.')[0]; // Extract public_id from URL
      //   await cloudinary.uploader.destroy(`blogs/${publicId}`); // Assumes images are stored in `blogs` folder
      // }

      await Blog.findByIdAndDelete(id);

      res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog:", error);
      res
        .status(500)
        .json({ message: "Failed to delete blog", error: error.message });
    }
  },
  allblogs: async (req, res) => {
    const blogs = await Blog.find({});
    res.render("admin/allblog", { blogs });
  },
  geteditblog: async (req, res) => {
    try {
      const blogId = req.params.id; // Extract blog ID from the URL parameter
      const blog = await Blog.findById(blogId); // Fetch the blog details from the database

      if (!blog) {
        return res.status(404).send("Blog not found");
      }

      res.render("admin/editblog", { blog }); // Pass the blog data to the EJS template
    } catch (error) {
      console.error("Error fetching blog:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  geteditTour: async (req, res) => {
    try {
      const { id: TourId } = req.params; // Destructure ID from req.params

      // Validate the ID to ensure it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(TourId)) {
        return res.status(400).send("Invalid Tour ID");
      }


      // Fetch the tour details along with the category name
      const tour = await Tour.findById(TourId).populate("category", "name");
      
      

      // Check if the tour exists
      if (!tour) {
        return res.status(404).send("Tour not found");
      }

      // Convert tripTime 'from' and 'to' to HH:mm format
if (tour.tripTime) {
  if (tour.tripTime.from) {
    if (/AM|PM/i.test(tour.tripTime.from)) {
      const [hours, minutes, meridian] = tour.tripTime.from
        .match(/(\d+):(\d+) (\w+)/i)
        .slice(1);
      const convertedHours =
        meridian.toLowerCase() === "pm" && hours !== "12"
          ? parseInt(hours, 10) + 12
          : meridian.toLowerCase() === "am" && hours === "12"
          ? "00"
          : hours.padStart(2, "0");
      tour.tripTime.from = `${convertedHours}:${minutes}`;
    }
  }

  if (tour.tripTime.to) {
    if (/AM|PM/i.test(tour.tripTime.to)) {
      const [hours, minutes, meridian] = tour.tripTime.to
        .match(/(\d+):(\d+) (\w+)/i)
        .slice(1);
      const convertedHours =
        meridian.toLowerCase() === "pm" && hours !== "12"
          ? parseInt(hours, 10) + 12
          : meridian.toLowerCase() === "am" && hours === "12"
          ? "00"
          : hours.padStart(2, "0");
      tour.tripTime.to = `${convertedHours}:${minutes}`;
    }
  }
}


      // Fetch all categories to allow selection in the edit form
      const categories = await Category.find({}).select("_id name"); // Fetch only required fields

      // Render the edit page with tour and categories
      res.render("admin/edittour", { tour, categories });
    } catch (error) {
      console.error("Error fetching tour:", error);
      res.status(500).send("Internal Server Error");
    }
  },

   deletePerImage : async (req, res) => {
    try {
      const tourId = req.params.id; // Get the tour ID from the URL parameter
      const imageUrlToDelete = req.body.imageUrl; // Get the image URL to delete from the request body
  
      // Find the tour by ID
      const tour = await Tour.findById(tourId);
      if (!tour) {
        return res.status(404).json({ success: false, message: 'Tour not found' });
      }
  
      // Remove the image from the images array
      tour.images = tour.images.filter(imageUrl => imageUrl !== imageUrlToDelete);
  
      // Save the updated tour
      await tour.save();
  
      res.json({ success: true, message: 'Image deleted successfully', tour });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
  
};
