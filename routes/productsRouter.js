const express = require("express");
const router = express.Router();
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

// GET route to render the product creation form
router.get("/create", function (req, res) {
  res.render("createproducts"); // Ensure the "createproducts.ejs" file exists in the "views" folder
});

// POST route to handle product creation
router.post("/create", upload.single("image"), async function (req, res) {
  try {
    let { name, price, discount, bgcolor, panelcolor, textcolor } = req.body;

    let product = await productModel.create({
      image: req.file.buffer,
      name,
      price,
      discount,
      bgcolor,
      panelcolor,
      textcolor,
    });
    req.flash("success", "Product created successfully");
    res.redirect("/owners/admin");
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Error creating product");
  }
});

module.exports = router;
