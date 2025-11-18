const User=require("../models/User");const {generateToken}=require("../utils/jwt");
exports.register=async(req,res)=>{try{const u=await User.create(req.body);res.json({token:generateToken(u._id),user:u});}catch(e){res.status(400).json({message:"Email zaten var"});}};
exports.login=async(req,res)=>{const{email,password}=req.body;const u=await User.findOne({email});if(!u||!(await u.matchPassword(password)))return res.status(401).json({message:"Hatalı bilgiler"});
res.json({token:generateToken(u._id),user:u});};
exports.me=(req,res)=>res.json({user:req.user});
