const fs = require("fs");
const path = require("path");
const ts = require("../node_modules/typescript");
const vm = require("vm");

const filePath = path.join(__dirname, "..", "i18n", "index.ts");
const code = fs.readFileSync(filePath, "utf8");
const js = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
}).outputText;

const sandboxRequire = (m) => {
  if (m === "i18next") {
    return {
      default: {
        use() {
          return this;
        },
        init() {
          return this;
        },
      },
    };
  }
  if (m === "react-i18next") {
    return {
      initReactI18next: {},
      useTranslation: () => ({ t: (k) => k, i18n: { language: "cn" } }),
    };
  }
  return require(m);
};

const sandbox = {
  console,
  require: sandboxRequire,
  module: {},
  exports: {},
  globalThis: {},
};
vm.createContext(sandbox);
vm.runInContext(js + "\n;globalThis.__RES__ = resources;", sandbox);

const resources = sandbox.globalThis.__RES__;
if (!resources) {
  console.error("Failed to load resources from i18n/index.ts");
  process.exit(1);
}

const langs = Object.keys(resources);

function collectKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(collectKeys(v, p));
    } else {
      keys.push(p);
    }
  }
  return keys;
}

const all = {};
for (const lang of langs) {
  all[lang] = new Set(collectKeys(resources[lang]));
}

const base = "cn";
for (const lang of langs) {
  if (lang === base) continue;
  const missingInLang = [...all[base]].filter((k) => !all[lang].has(k));
  const extraInLang = [...all[lang]].filter((k) => !all[base].has(k));
  console.log(`--- Compare ${base} vs ${lang} ---`);
  console.log("Missing in", lang, ":", missingInLang.length);
  if (missingInLang.length) console.log(missingInLang.join("\n"));
  console.log("Extra in", lang, ":", extraInLang.length);
  if (extraInLang.length) console.log(extraInLang.join("\n"));
}

