import mongoose from "mongoose";

const navbarSchema = new mongoose.Schema({

  logo: String,

  links: [
    {
      name: String,
      path: String
    }
  ],

  icons: {
    search: Boolean,
    user: Boolean,
    wishlist: Boolean,
    cart: Boolean
  }

});

export default mongoose.model("Navbar", navbarSchema);