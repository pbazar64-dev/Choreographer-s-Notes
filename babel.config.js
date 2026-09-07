module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    // .sql-миграции Drizzle подставляются в бандл как строки
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
