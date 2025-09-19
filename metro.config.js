const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('bin', 'txt', 'jpg', 'png', 'json', 'svg', 'ttf', 'otf');

module.exports = config;
