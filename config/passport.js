// ---------------------------------------------------------
// PASSPORT.JS CONFIGURATION (Social Login / OAuth)
// ---------------------------------------------------------
// This file configures Google and GitHub login strategies
// When a user clicks "Login with Google/GitHub", Passport handles the flow

// Import Passport.js library (handles authentication flows)
import passport from "passport";
// Import our centralized config for OAuth credentials
import config from "./index.js";

// Import Google OAuth 2.0 strategy for "Login with Google"
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Import User model to find or create users in our database
import User from "../models/User.js";

// Import GitHub OAuth strategy for "Login with GitHub"
import { Strategy as GitHubStrategy } from "passport-github2";


// =============================================================
// GOOGLE LOGIN STRATEGY
// =============================================================
// Configure Passport to use Google for authentication
passport.use(
  new GoogleStrategy(
    {
      // Our Google app credentials (from Google Cloud Console)
      clientID: config.oauth.google.clientId,           // Identifies our app to Google
      clientSecret: config.oauth.google.clientSecret,   // Our app's secret key
      callbackURL: config.oauth.google.callbackUrl,     // Where Google sends users back
    },

    // This function runs AFTER Google login is successful
    // Google gives us the user's profile data
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract email from the Google profile
        const email = profile.emails[0].value;

        // Extract Google's unique user ID
        const googleId = profile.id;

        // Extract the user's display name
        const name = profile.displayName;

        // Check if a user with this email already exists in our database
        let user = await User.findOne({
          where: { email },
        });

        // If user already exists in our database
        if (user) {

          // If this user signed up with email/password before (no OAuth linked)
          // Link their account with Google now
          if (!user.provider || !user.providerId) {
            user.provider = "google";        // Mark that they're now linked with Google
            user.providerId = googleId;      // Store their Google ID
            await user.save();               // Save the changes
          }

          // User found → login successful
          return done(null, user);
        }

        // If user doesn't exist → create a brand new account
        user = await User.create({
          username: name,                    // Use their Google name
          email: email,                      // Use their Google email
          password: "GOOGLE_OAUTH_USER",     // Placeholder password (Google users don't need one)
          role: "user",                      // Default role for new users
          provider: "google",                // Mark as Google login
          providerId: googleId,              // Store their Google ID
        });

        // New user created → login successful
        return done(null, user);

      } catch (error) {
        // If anything goes wrong, pass the error to Passport
        return done(error, null);
      }
    }
  )
);

// =============================================================
// GITHUB LOGIN STRATEGY
// =============================================================
// Configure Passport to use GitHub for authentication
passport.use(
  new GitHubStrategy(
    {
      // Our GitHub app credentials (from GitHub Developer Settings)
      clientID: config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret,
      callbackURL: config.oauth.github.callbackUrl,
    },
    // This function runs AFTER GitHub login is successful
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get email from GitHub (some users don't have public email, so we create one)
        const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;

        // Get GitHub's unique user ID
        const githubId = profile.id;

        // Get the user's name (fall back to username if display name is empty)
        const name = profile.displayName || profile.username;

        // Check if a user with this email already exists
        let user = await User.findOne({
          where: { email },
        });

        // If user already exists
        if (user) {
          // Link their account with GitHub if not already linked
          if (!user.provider || !user.providerId) {
            user.provider = "github";
            user.providerId = githubId;
            await user.save();
          }

          // User found → login successful
          return done(null, user);
        }

        // Create new user if they don't exist
        user = await User.create({
          username: name,
          email: email,
          password: "GITHUB_OAUTH_USER",     // Placeholder password
          role: "user",
          provider: "github",
          providerId: githubId,
        });

        // New user created → login successful
        return done(null, user);
      } catch (error) {
        // Pass any errors to Passport
        return done(error, null);
      }
    }
  )
);

// Export the configured Passport instance
export default passport;
