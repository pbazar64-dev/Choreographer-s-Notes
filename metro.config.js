// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .sql-файлы миграций Drizzle импортируются как исходники
config.resolver.sourceExts.push('sql');

module.exports = config;
