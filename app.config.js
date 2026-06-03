const { withAndroidManifest } = require('@expo/config-plugins');

// Load app.json as base
const baseConfig = require('./app.json');

module.exports = {
  ...baseConfig.expo,
};
