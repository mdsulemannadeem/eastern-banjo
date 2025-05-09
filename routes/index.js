const express = require("express");
const router = express.Router();
const isloggedin = require("../middlewares/isLoggedin");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


router.get("/login", function(req, res) {
  const redirect = req.query.redirect;
  let message = redirect ? "Please login to add products to your cart" : "";
  let error = req.flash("error");
  res.render("index", { error, message, loggedin: false });
});

router.get("/register", function(req, res) {
  res.render("index", { error: [], message: "", loggedin: false });
});

// Add email validation middleware
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Add register post route
router.post("/users/register", async function(req, res) {
  try {
    const { email, password, fullname, contact } = req.body;
    
    // Validate email
    if (!validateEmail(email)) {
      req.flash("error", "Please enter a valid email address");
      return res.redirect("/register");
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/register");
    }

    // Create new user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new userModel({
      email,
      password: hashedPassword,
      fullname,
      contact
    });

    await newUser.save();
    req.flash("success", "Registration successful! Please login.");
    res.redirect("/login");
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Registration failed. Please try again.");
    res.redirect("/register");
  }
});

router.get("/", async function (req, res) {
  try {
    let error = req.flash("error");
    let message = req.flash("success") || [];
    let products = await productModel.find();
    
    // Check if user is logged in based on token
    const loggedin = req.cookies.token ? true : false;
    let user = { wishlist: [] };
    
    if (loggedin) {
      // Get fresh user data with populated wishlist
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
      user = await userModel.findOne({ email: decoded.email }).select("-password");
    }
    
    res.render("home", { error, message, loggedin, products, user });
  } catch (err) {
    console.error(err.message);
    res.render("home", { error: [], message: [], loggedin: false, products: [], user: { wishlist: [] } });
  }
});

router.get("/shop", isloggedin, async function (req, res) {
    try {
        const sortby = req.query.sortby || 'popular'; // Default sort
        let products = await productModel.find();
        let success = req.flash("success");
        
        // Sort products based on selected option
        products = sortItems(products, sortby);
        
        res.render("shop", { 
            products,
            success,
            sortby, // Pass the current sort option to maintain selection state
            loggedin: true,
            user: req.user // Make sure this is populated by your isloggedin middleware
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
    }
});

// Add the sortItems function
function sortItems(items, sortType) {
  let sortedItems = [...items]; // clone to avoid modifying original

  switch (sortType) {
    case "popular":
      // You might need to add a popularity field to your product model
      // For now, just return the default order
      break;

    case "newest":
      // Assuming products have a createdAt field
      sortedItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;

    case "lowToHigh":
      sortedItems.sort((a, b) => a.price - b.price);
      break;

    case "highToLow":
      sortedItems.sort((a, b) => b.price - a.price);
      break;

    default:
      console.warn("Unknown sort type");
  }

  return sortedItems;
}

router.get("/cart", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email }).populate('cart.product');
   
    // Calculate cart totals
    let totalMRP = 0;
    let totalDiscount = 0;
    const platformFee = 20;
    
    // Calculate totals from cart items
    if (user.cart && user.cart.length > 0) {
      user.cart.forEach(item => {
        if (item.product) { // Check if product exists
          totalMRP += Number(item.product.price) * item.quantity;
          if (item.product.discount) {
            totalDiscount += Number(item.product.discount) * item.quantity;
          }
        }
      });
    }
    
    const totalAmount = totalMRP - totalDiscount + platformFee;
    
    res.render("cart", {
      user,
      totalMRP,
      totalDiscount,
      platformFee,
      totalAmount,
      shippingFee: "FREE"
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/addtocart/:productid", isloggedin, async function (req, res) {
  try {
    // Add this check
    if (!req.user || !req.user.email) {
      req.flash("error", "Authentication error");
      return res.redirect("/login");
    }
    
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    // Check if product already exists in cart
    const existingProductIndex = user.cart.findIndex(item => 
      item.product && item.product.toString() === productId
    );
    
    if (existingProductIndex >= 0) {
      // Increment quantity if product already exists
      user.cart[existingProductIndex].quantity += 1;
    } else {
      // Add new product with quantity 1
      user.cart.push({ product: productId, quantity: 1 });
    }
    
    await user.save();
    req.flash("success", "Product added to cart");
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Increase quantity
router.get("/increasequantity/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    const existingProductIndex = user.cart.findIndex(item => 
      item.product && item.product.toString() === productId
    );
    
    if (existingProductIndex >= 0) {
      user.cart[existingProductIndex].quantity += 1;
      await user.save();
    }
    
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Decrease quantity
router.get("/decreasequantity/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    const existingProductIndex = user.cart.findIndex(item => 
      item.product && item.product.toString() === productId
    );
    
    if (existingProductIndex >= 0) {
      if (user.cart[existingProductIndex].quantity > 1) {
        user.cart[existingProductIndex].quantity -= 1;
      } else {
        // Remove product if quantity becomes 0
        user.cart.splice(existingProductIndex, 1);
      }
      await user.save();
    }
    
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/logout", isloggedin, function (req, res) {
  res.render("shop");
});

// Profile route
router.get("/profile", isloggedin, async function (req, res) {
  try {
    // Find user with populated cart
    const user = await userModel.findOne({ email: req.user.email })
                              .select("-password")
                              .populate('cart.product');
    
    // Get any success message from flash
    const success = req.flash("success");
    
    res.render("profile", { user, success });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Update profile route
router.post("/profile/update", isloggedin, async function (req, res) {
  try {
    const { fullname } = req.body;
    
    // Update user info
    await userModel.findOneAndUpdate(
      { email: req.user.email },
      { fullname, contact }
    );
    
    req.flash("success", "Profile updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Failed to update profile");
    res.redirect("/profile");
  }
});

// Change password route
router.post("/profile/change-password", isloggedin, async function (req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Find user with password
    const user = await userModel.findOne({ email: req.user.email });
    
    // Check if current password is correct
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      req.flash("error", "Current password is incorrect");
      return res.redirect("/profile");
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      req.flash("error", "New passwords don't match");
      return res.redirect("/profile");
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hash;
    await user.save();
    
    req.flash("success", "Password changed successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Failed to change password");
    res.redirect("/profile");
  }
});

// Order details route
router.get("/order/:orderId", isloggedin, async function (req, res) {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    const orderId = req.params.orderId;
    
    // Find the specific order in the user's orders array
    const order = user.orders.find(o => o._id.toString() === orderId);
    
    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/profile");
    }
    
    res.render("order-details", { user, order });
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Failed to load order details");
    res.redirect("/profile");
  }
});

// Wishlist route
router.get("/wishlist", isloggedin, async function (req, res) {
  try {
    // Find user with populated wishlist products
    const user = await userModel.findOne({ email: req.user.email })
                              .select("-password")
                              .populate('wishlist');
    
    res.render("wishlist", { user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Add to wishlist route
router.get("/addtowishlist/:productid", isloggedin, async function (req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        const productId = req.params.productid;
        
        // Check if product already exists in wishlist
        const isProductInWishlist = user.wishlist.some(item => 
            item.toString() === productId
        );
        
        if (!isProductInWishlist) {
            // Only add if not already in wishlist
            user.wishlist.push(productId);
            await user.save();
            
            // For AJAX requests, return JSON
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.json({ 
                    success: true, 
                    message: "Product added to wishlist", 
                    count: user.wishlist.length 
                });
            }
            
            // For regular requests, use flash and redirect
            req.flash("success", "Product added to wishlist");
        } else if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: "Product is already in wishlist", 
                count: user.wishlist.length 
            });
        }
        
        // Redirect back to the referring page
        const referer = req.headers.referer || "/shop";
        res.redirect(referer);
    } catch (err) {
        console.error(err.message);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
        res.status(500).send("Internal Server Error");
    }
});

// Remove from wishlist route
router.get("/removefromwishlist/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    // Find and remove the product from wishlist
    const productIndex = user.wishlist.findIndex(item => item.toString() === productId);
    
    if (productIndex !== -1) {
      user.wishlist.splice(productIndex, 1);
      await user.save();
      
      // For AJAX requests, return JSON with updated user data
      if (req.xhr || req.headers.accept.includes('application/json')) {
        // Get fresh user data to confirm changes
        const updatedUser = await userModel.findOne({ email: req.user.email });
        
        return res.json({
          success: true,
          message: "Product removed from wishlist",
          count: updatedUser.wishlist.length,
          wishlist: updatedUser.wishlist
        });
      }
      
      req.flash("success", "Product removed from wishlist");
    }
    
    // Only redirect for non-AJAX requests
    if (!(req.xhr || req.headers.accept.includes('application/json'))) {
      res.redirect("/wishlist");
    }
  } catch (err) {
    console.error(err.message);
    
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
    res.status(500).send("Internal Server Error");
  }
});

// Move from wishlist to cart
router.get("/movetocart/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    // Find and remove the product from wishlist
    const productIndex = user.wishlist.findIndex(item => item.toString() === productId);
    
    if (productIndex !== -1) {
      user.wishlist.splice(productIndex, 1);
      
      // Check if product already exists in cart
      const existingProductIndex = user.cart.findIndex(item => 
        item.product && item.product.toString() === productId
      );
      
      if (existingProductIndex >= 0) {
        // Increment quantity if product already exists
        user.cart[existingProductIndex].quantity += 1;
      } else {
        // Add new product with quantity 1
        user.cart.push({ product: productId, quantity: 1 });
      }
      
      await user.save();
      req.flash("success", "Product moved to cart");
    }
    
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
