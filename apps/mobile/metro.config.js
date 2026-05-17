const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const projectNodeModules = path.resolve(projectRoot, "node_modules");
const rootNodeModules = path.resolve(workspaceRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

/** Monorepo: חבילות לעיתים מותקנות רק ב־root — מפורשים ל־Metro */
const asyncStorageRoot = path.join(rootNodeModules, "@react-native-async-storage/async-storage");
const firebaseAuthRoot = path.join(rootNodeModules, "@firebase/auth");

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [projectNodeModules, rootNodeModules],
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    "@react-native-async-storage/async-storage": asyncStorageRoot,
    "@firebase/auth": firebaseAuthRoot,
  },
};

module.exports = config;
