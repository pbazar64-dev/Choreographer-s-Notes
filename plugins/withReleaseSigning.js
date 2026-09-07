const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Подписывание release-сборки собственным ключом.
 *
 * Expo при prebuild подписывает release отладочным ключом, а отладочный ключ
 * генерируется заново на каждой машине — обновление такой сборки не встанет
 * поверх предыдущей. Плагин добавляет signingConfig release, который читает
 * android/keystore.properties (файл в .gitignore). Если файла нет, поведение
 * прежнее: сборка подписывается отладочным ключом.
 */

const SIGNING_CONFIG = `        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
`;

const RELEASE_SIGNING_LINE = `            signingConfig rootProject.file("keystore.properties").exists() ? signingConfigs.release : signingConfigs.debug`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;

    if (!contents.includes('keystore.properties')) {
      if (!contents.includes('signingConfigs {')) {
        throw new Error('withReleaseSigning: не найден блок signingConfigs в app/build.gradle');
      }
      contents = contents.replace('signingConfigs {\n', `signingConfigs {\n${SIGNING_CONFIG}`);

      const debugSigningInRelease =
        '            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug';
      if (!contents.includes(debugSigningInRelease)) {
        throw new Error('withReleaseSigning: не найдена signingConfig release-сборки');
      }
      contents = contents.replace(
        debugSigningInRelease,
        `            // Ключ подписи берётся из android/keystore.properties (см. README).\n${RELEASE_SIGNING_LINE}`,
      );
    }

    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
};
