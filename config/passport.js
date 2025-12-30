// Import passport library (used for authentication)
import passport from "passport";

// Import Google OAuth strategy from passport
// This helps us login users using Google account
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Import User model (table) to save / find users in database
import User from "../models/User.js";


// Tell passport that we want to use Google login
passport.use(
  new GoogleStrategy(
    {
      // Google gives us CLIENT_ID (who we are)
      clientID: process.env.CLIENT_ID,

      // Google gives us CLIENT_SECRET (password for Google app)
      clientSecret: process.env.CLIENT_SECRET,

      // Google will redirect user to this URL after successful login
      callbackURL: process.env.CALLBACK_URL,
    },

    // This function runs AFTER Google login is successful
    // Google sends us user data in "profile"
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get user's email from Google profile
        const email = profile.emails[0].value;

        // Get unique Google user ID
        const googleId = profile.id;

        // Get user's name from Google
        const name = profile.displayName;

        // --------------------------------------
        // STEP 1️⃣: Check if user already exists
        // We ONLY check by email
        // --------------------------------------
        let user = await User.findOne({
          where: { email },
        });

        // --------------------------------------
        // STEP 2️⃣: If user already exists in DB
        // --------------------------------------
        if (user) {

          // If this user was created earlier using normal signup
          // then provider & providerId might be empty
          if (!user.provider || !user.providerId) {

            // Now link this account with Google
            user.provider = "google";
            user.providerId = googleId;

            // Save updated user data
            await user.save();
          }

          // Login successful → send user data to passport
          return done(null, user);
        }

        // --------------------------------------
        // STEP 3️⃣: If user does NOT exist
        // Create a brand new user
        // --------------------------------------
        user = await User.create({
          username: name,          // Google name
          email: email,            // Google email

          // Dummy password because Google users don't need password
          password: "GOOGLE_OAUTH_USER",

          role: "user",            // Default role
          provider: "google",      // Login method
          providerId: googleId,    // Google unique ID
        });

        // Login successful → send new user data
        return done(null, user);

      } catch (error) {
        // If anything goes wrong, send error to passport
        return done(error, null);
      }
    }
  )
);

// Export passport so it can be used in app.js
export default passport;
