// ---------------------------------------------------------
// 1) IMPORTS
// ---------------------------------------------------------

import { DataTypes } from "sequelize";          // Column ke type define karne ke liye
import sequelize from "../config/db.js";        // Sequelize instance → DB me table create karne ke liye



// ---------------------------------------------------------
// 2) USER MODEL DEFINE
// ---------------------------------------------------------
const User = sequelize.define("User", {         // "User" naam ka table banayega

  id: {
    type: DataTypes.INTEGER,                    // Number hoga
    autoIncrement: true,                        // Automatically 1, 2, 3...
    primaryKey: true                            // Unique identity
  },

  username: {
    type: DataTypes.STRING,                     // Text type
    allowNull: false                            // Empty nahi reh sakta
  },

  email: {
    type: DataTypes.STRING,                     // Text type
    allowNull: false,                           // Empty email allowed nahi
    unique: true                                // Same email do baar allowed nahi
  },

  role: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: "user"   // user | admin | superadmin
},


  password: {
    type: DataTypes.STRING,                     // Hashed password store hoga
    allowNull: false                            // Empty password allowed nahi
  },
  refreshToken: {
    type: DataTypes.STRING,   // Long token store hoga
    allowNull: true,          // Null allowed for logout
  },
  
  phone: {
  type: DataTypes.STRING,
  allowNull: true,
  unique: true,
},

otp: {
  type: DataTypes.STRING,
  allowNull: true,
},

otpExpiry: {
  type: DataTypes.DATE,
  allowNull: true,
},
provider: {
  type: DataTypes.STRING,
  allowNull: true,
},

providerId: {
  type: DataTypes.STRING,
  allowNull: true,
},
password: {
  type: DataTypes.STRING,
  allowNull: true,
},


}, {
  timestamps: true                               // createdAt & updatedAt automatically add honge
});



// ---------------------------------------------------------
// 3) EXPORT MODEL
// ---------------------------------------------------------

export default User;                             // Ab routes me User.findOne / create use kar sakte hain

