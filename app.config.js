const { withAndroidManifest } = require('@expo/config-plugins');

// Load app.json as base
const baseConfig = require('./app.json');

module.exports = {
  ...baseConfig.expo,
  extra: {
    replicateApiToken: process.env.REPLICATE_API_TOKEN ?? '',
  },
};
