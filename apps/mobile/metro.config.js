const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `@ide/backoff` (transitive of expo-notifications) require'lar Node
// built-in `assert` modülünü; Metro RN için bunu polyfill etmiyor.
// Lokal stub'a yönlendir.
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  assert: path.resolve(__dirname, 'assert-stub.js'),
};

// RN tek bir React instance ister; farklı paketlerin nested kopyaları bundle'a
// iki React sokup "dispatcher null" hatası verir (Cannot read property 'useId'
// of null vb.). Her react/react-dom import'unu (bare + alt-path: react/jsx-runtime,
// react/jsx-dev-runtime...) TEK kopyaya zorla. Standalone repoda tek React sürümü
// var ve hoisted köke çözülür; bu yüzden yolu sabit yazmak yerine mobile'dan
// require.resolve ile bul (eski monorepo'da apps/mobile/node_modules'daydı).
const resolveDir = (name) => {
  try {
    return path.dirname(
      require.resolve(`${name}/package.json`, { paths: [__dirname] }),
    );
  } catch {
    return null;
  }
};
const singletonDirs = {};
const reactDir = resolveDir('react');
if (reactDir) singletonDirs.react = reactDir;
const reactDomDir = resolveDir('react-dom');
if (reactDomDir) singletonDirs['react-dom'] = reactDomDir;
const redirect = (moduleName) => {
  for (const [name, dir] of Object.entries(singletonDirs)) {
    if (moduleName === name) return require.resolve(dir);
    if (moduleName.startsWith(name + '/')) {
      return require.resolve(path.join(dir, moduleName.slice(name.length + 1)));
    }
  }
  return null;
};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const filePath = redirect(moduleName);
  if (filePath) {
    return { type: 'sourceFile', filePath };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
