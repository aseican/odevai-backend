const jwt=require("jsonwebtoken");const User=require("../models/User");
exports.protect=async(req,res,next)=>{const a=req.headers.authorization;if(!a||!a.startsWith("Bearer "))return res.status(401).json({message:"Yetkisiz istek"});const t=a.split(" ")[1];
try{const d=jwt.verify(t,process.env.JWT_SECRET);req.user=await User.findById(d.id);next();}catch(e){res.status(401).json({message:"Geçersiz token"});}};
