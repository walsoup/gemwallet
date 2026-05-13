const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limit workers to 1 to reduce memory pressure during build in CI environments.
// This is especially important for GitHub Actions runners with limited RAM.
config.maxWorkers = process.env.CI ? 1 : 2;

module.exports = config;
