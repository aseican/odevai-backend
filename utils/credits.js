const User=require("../models/User");
exports.consumeCredits=async(id,amt=1)=>{const u=await User.findById(id);if(u.credits<amt)throw new Error("Yetersiz kredi");u.credits-=amt;await u.save();return u;};
