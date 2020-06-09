module.exports = {
  // browser target config see in .browserlistsrc
  parser: "postcss-scss",
  plugins: {
    "postcss-import": {},
    autoprefixer: {}, // it adds vendor prefixes ::placeholder => ::-webkit-input-placeholder, ::-moz-placeholder etc. https://github.com/postcss/autoprefixer
    "postcss-font-base64": {}
  }
};
