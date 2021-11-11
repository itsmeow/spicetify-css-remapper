const diff = require("diff");
const prettier = require("prettier");
const fs = require("fs");
const moment = require("moment");
let subroutine = null;
const momentStart = (text) => {
  console.log(text);
  subroutine = moment.now();
};
const momentEnd = (text) => {
  if (subroutine === null) {
    console.error("momentStart not called!");
    return;
  }
  let dur = moment.duration(moment.now() - subroutine);
  console.log(
    `Done! (${
      dur.milliseconds() < 5000 ? `${dur.milliseconds()}ms` : dur.humanize()
    })`
  );
  subroutine = null;
};
const cached = fs.existsSync("diff.json");
momentStart("Loading css-map.json...");
const cssMap = require("./css-map.json");
momentEnd();
let xpuiOldData = null;
let xpuiNewData = null;
if (!cached) {
  momentStart("Loading xpui_old.css...");
  xpuiOldData = prettier.format(
    fs.readFileSync("xpui_old.css", { encoding: "utf8" }),
    { parser: "css" }
  );
  momentEnd();
  momentStart("Loading xpui.css...");
  xpuiNewData = prettier.format(
    fs.readFileSync("xpui.css", { encoding: "utf8" }),
    { parser: "css" }
  );
  momentEnd();
}
let diffCss = null;
if (cached) {
  momentStart("Loading CSS diff cache...");
  diffCss = require("./diff.json");
} else {
  momentStart("Creating CSS diff... (this could take a while!)");
  diffCss = diff.diffLines(xpuiOldData, xpuiNewData);
}
momentEnd();
fs.writeFileSync("diff.json", JSON.stringify(diffCss));
momentStart("Parsing CSS diff...");
const classRegex = /(?<=(\.|@[\w-]+\ ))\w+(?=(?:\w+)?)/g;
let classMap = {};
for (let i = 0; i + 1 < diffCss.length; i++) {
  let cur = diffCss[i];
  let next = diffCss[i + 1];
  if (cur.removed === true && next.added === true && cur.count === next.count) {
    let classMatchesOld = cur.value.match(classRegex);
    let classMatchesNew = next.value.match(classRegex);
    if (
      classMatchesOld &&
      classMatchesNew &&
      classMatchesOld.length === classMatchesNew.length &&
      classMatchesOld.length > 0
    ) {
      let mixupPrint = false;
      for (let j = 0; j < classMatchesOld.length; j++) {
        let o = classMatchesOld[j];
        let n = classMatchesNew[j];
        if (o in classMap) {
          if (n !== classMap[o]) {
            console.log(
              `Possible mixup: ${o} matches ${classMap[o]} but we got ${n}`
            );
            let lineCount = cur.value.split("\n").length;
            if (lineCount < 3) {
              console.log("Overriding based on match criteria");
              classMap[o] = n;
            }
            if (!mixupPrint) {
              mixupPrint = true;
            }
          }
        } else {
          classMap[o] = n;
        }
      }
      if (mixupPrint) {
        console.log("Old\n" + cur.value);
        console.log("New\n" + next.value);
      }
      // No need to process the next one
      i++;
    }
  }
}
momentEnd();
const mapRegex = (v) => new RegExp(`(\\w+):"${v}"`, "g");
let classMap2 = {};
momentStart("Reading xpui.js");
let xpuiJsOld = fs.readFileSync("xpui_old.js", { encoding: "utf8" });
momentEnd();
momentStart("Reading xpui_old.js");
let xpuiJsNew = fs.readFileSync("xpui.js", { encoding: "utf8" });
momentEnd();
const filterRegex = /{(?:\w+:"[\w :()-]+",?)*?(?:\w+:"\w{20}",?)+}/g;
xpuiJsOld = xpuiJsOld.match(filterRegex);
xpuiJsNew = xpuiJsNew.match(filterRegex);
let newAll = [];
if (
  xpuiJsOld.length != xpuiJsNew.length ||
  xpuiJsNew.length === 0 ||
  xpuiJsOld.length === 0
) {
  console.log("LENGTH ERROR");
}
for (let i = 0; i < xpuiJsOld.length; i++) {
  newAll[i] = {};
  let oldMappings = {};
  for (let oldClass of Object.keys(classMap)) {
    let matches = mapRegex(oldClass).exec(xpuiJsOld[i]);
    if (matches?.length > 0) {
      let key = matches[1];
      if (key in oldMappings) {
        console.log("DUPLICATE KEY");
      }
      oldMappings[key] = oldClass;
    }
  }
  for (let newClass of Object.values(classMap)) {
    let matches = mapRegex(newClass).exec(xpuiJsNew[i]);
    if (matches?.length > 0) {
      let key = matches[1];
      newAll[i][key] = newClass;
      classMap2[oldMappings[key]] = newClass;
    }
  }
  for (let [key, val] of Object.entries(classMap2)) {
    if (key in classMap && classMap[key] !== val) {
      console.log("Improper from CSS engine, overriding:", key, classMap[key]);
    }
    classMap[key] = val;
  }
}

let newCssMap = {};
let nextKeys = [];
let vals = [];
for (let [key, val] of Object.entries(cssMap)) {
  let k = key;
  if (key in classMap) {
    k = classMap[key];
  }
  newCssMap[k] = val;
  nextKeys.push(k);
  vals.push(val);
}

const counts = {};
for (const key of nextKeys) {
  counts[key] = key in counts ? counts[key] + 1 : 1;
}
let ignore = [];
let guesses = [];
for (let i = 0; i < nextKeys.length; i++) {
  let key = nextKeys[i];
  if (
    counts[key] > 1 &&
    vals[i] !== newCssMap[key] &&
    !ignore.includes(key) &&
    !guesses.includes(key)
  ) {
    console.log(
      "Duplicate key:",
      key,
      "matches",
      vals[i],
      "and",
      newCssMap[key]
    );
    for (let map of newAll) {
      for (let [k, v] of Object.entries(map)) {
        let v1 = vals[i].split("-");
        let v2 = newCssMap[key].split("-");
        if (k === v1[v1.length - 1]) {
          console.log("Candidate", v, k);
          if (v === key) {
            console.log("Match override", v, vals[i]);
            newCssMap[v] = vals[i];
            ignore.push(v);
          }
        } else if (v !== key && k === v2[v2.length - 1]) {
          console.log("Reverse candidate", v, k);
          if (!guesses.includes(key)) {
            console.log("Guess override (has reverse)", key, vals[i]);
            newCssMap[key] = vals[i];
            guesses.push(key);
          }
        }
      }
    }
    if (!ignore.includes(key) && !guesses.includes(key)) {
      let keysWith = Object.keys(cssMap).filter(
        (k) => cssMap[k] === newCssMap[key] && k !== key
      );
      if (keysWith.length > 0) {
        console.log("Guess override", key, vals[i]);
        newCssMap[key] = vals[i];
        guesses.push(key);
      }
    }
  }
}
guesses = guesses.filter((k) => !ignore.includes(k));
console.log(`Guessed ${guesses.length} duplicate keys - review these manually`);
console.log(guesses);

fs.writeFileSync(
  "css-map-new.json",
  prettier.format(JSON.stringify(newCssMap), {
    parser: "json",
    tabWidth: 4,
    trailingComma: "es5",
    printWidth: 150,
  })
);
