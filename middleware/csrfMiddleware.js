import csrf from "csurf";

// CSRF protection using cookies
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,        // JS cannot access
    sameSite: "strict",    // blocks cross-site
    secure: false,         // true in production (HTTPS)
  },
});

export default csrfProtection;

