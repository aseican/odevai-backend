const r=require("express").Router();
const {register,login,me}=require("../controllers/authController");
const {protect}=require("../middleware/auth");
r.post("/register",register);
r.post("/login",login);
r.get("/me",protect,me);
module.exports=r;
