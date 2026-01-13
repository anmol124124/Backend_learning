// Import passport library (used for authentication)
import passport from "passport";

// Import Google OAuth strategy from passport
// This helps us login users using Google account
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Import User model (table) to save / find users in database
import User from "../models/User.js";

import { Strategy as GitHubStrategy } from "passport-github2";


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

// GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get user's email from GitHub profile
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;

        // Get unique GitHub user ID
        const githubId = profile.id;

        // Get user's name from GitHub
        const name = profile.displayName || profile.username;

        // Check if user already exists by email
        let user = await User.findOne({
          where: { email },
        });

        // If user exists
        if (user) {
          // Link account with GitHub if not already linked
          if (!user.provider || !user.providerId) {
            user.provider = "github";
            user.providerId = githubId;
            await user.save();
          }

          return done(null, user);
        }

        // Create new user if doesn't exist
        user = await User.create({
          username: name,
          email: email,
          password: "GITHUB_OAUTH_USER", // Dummy password
          role: "user",
          provider: "github",
          providerId: githubId,
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Export passport so it can be used in app.js
export default passport;
