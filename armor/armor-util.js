// Both armor-scripts.js and solver.js use this file, shared code

// Custom set (hashmap implementation)
class Entry {
  constructor(key) {
    this.key = key;
    this.next = null;
  }
}

class CustomSet {
  constructor(hashFunction = build => build.hash, equalsFunction = (a, b) => a.equals(b)) {
    this.hashFunction = hashFunction;
    this.equalsFunction = equalsFunction;
    // we are dealing with hundreds of thousands of builds
    this.clear();
  }

  hash(key) {
    return this.hashFunction(key) % this.entries.length;
  }

  add(key) {
    const hash = this.hashFunction(key);
    let entry = this.entries[hash];
    if (entry == null) {
      this.entries[hash] = new Entry(key);
    }
    else {
      while (entry.next != null && !this.equalsFunction(entry.key, key)) {
        entry = entry.next;
      }
      if (this.equalsFunction(entry.key, key)) {
        return false;
      }
      entry.next = new Entry(key);
    }
    this.size++;
    return true;
  }

  addAll(arr) {
    for (const key of arr) {
      this.add(key);
    }
  }

  contains(key) {
    const hash = this.hashFunction(key);
    let entry = this.entries[hash];
    while (entry != null) {
      if (this.equalsFunction(entry.key, key)) {
        return true;
      }
      entry = entry.next;
    }
    return false;
  }

  remove(key) {
    const hash = this.hashFunction(key);
    let entry = this.entries[hash];
    if (entry == null) {
      return false;
    }
    if (this.equalsFunction(entry.key, key)) {
      this.entries[hash] = entry.next;
    }
    else {
      while (entry.next != null && !this.equalsFunction(entry.next.key, key)) {
        entry = entry.next;
      }
      if (entry.next == null) {
        return false;
      }
      entry.next = entry.next.next;
    }
    this.size--;
    return true;
  }

  clear() {
    this.entries = new Array(1000);
    this.size = 0;
  }

  toList() {
    const list = [];
    for (const i in this.entries) {
      let entry = this.entries[i];
      while (entry != null) {
        list.push(entry.key);
        entry = entry.next;
      }
    }
    return list;
  }
}

class Armor {
  constructor(name, stats, jewelSlots) {
    this.name = name;
    this.stats = stats;
    this.jewelSlots = jewelSlots;
    this.nonZeroStats = stats.map((val, i) => i).filter(i => stats[i] > 0);
  }
}
Armor.prototype.toString = function() {
  return this.name;
}

// Build class
class Build {
  constructor(armorList = [], vit = 0, stats = [0, 0, 0, 0, 0, 0], enchants = [0, 0, 0, 0, 0, 0], jewels = [0, 0, 0, 0, 0, 0], useEnchants = false, useJewels = false) {
    this.stats = stats
    this.armorList = armorList;
    this.vit = vit;
    this.enchants = enchants;
    this.jewels = jewels;
    this.jewelSlots = armorList.reduce((sum, armor) => sum + armor.jewelSlots, 0);
    this.hash = getHash(stats);
    // this.statCode = getStatCode(stats);
    this.multiplier = getMult(this) * (1 + .005 * getExtraStats(this));
    this.useEnchants = useEnchants;
    this.useJewels = useJewels;
  }
  
  value() {
    return this.multiplier;
  }

  compare(other) {
    return this.multiplier - other.multiplier;
  }

  equals(other) {
    // return this.statCode === other.statCode;
    for (let i in this.stats) {
      if (this.stats[i] != other.stats[i])
        return false;
    }
    return true;
  }

  // Stat functions
  power() {
    return this.stats[0];
  }
  defense() {
    return this.stats[1];
  }
  size() {
    return this.stats[2];
  }
  intensity() {
    return this.stats[3];
  }
  speed() {
    return this.stats[4];
  }
  agility() {
    return this.stats[5];
  }

  isValid() {
    if (!this.stats.every((val, i) => val <= maxStats[i]))
      return false;
    if (!this.useEnchants && !this.useJewels)
      return this.stats.every((val, i) => val >= minStats[i]);
    return getExtraStats(this) >= -.05;
  }

  // HTML incorporation
  // value is from (1.7, 2.7)
  multiplierColorStr() {
    return getMultiplierColorStr(this.multiplier);
  }

  asHTML() {
    return `
      <div class="list-element">
        <div>Multiplier: <span style="color: ${this.multiplierColorStr()}">${getFormattedMultiplierStr(this.multiplier)}</span></div>
        ${`<div>Base Multiplier: <span style="color: ${getMultiplierColorStr(getBaseMult(this))}">${getFormattedMultiplierStr(getBaseMult(this))}</span></div>`}
        <div>${StatOrder.map(stat => `<span class="${stat}">${this[stat]()}</span><img class="icon" src="./armor/${stat}_icon.png">`).join(" ")}</div>
        <div class="br-small"></div>
        <table>
          <th>Armor</th>
          ${this.armorList.map(armor => {
            Object.setPrototypeOf(armor, Armor.prototype);
            const armorName = armor.toString().replaceAll("_", " ");
            return `<tr><td class="${armorName.split(" ")[0].toLowerCase()}">${armorName}</td></tr>`;
          }).join("")}
        </table>
        <div class="br-small"></div>
        <div>Enchants: ${StatOrder.map((statName, i) => `<span class="${statName}">${this.enchants[i]}</span>`).join("/")}</div>
        <div>Jewels: ${StatOrder.map((statName, i) => `<span class="${statName}">${this.jewels[i]}</span>`).join("/")}</div>
      </div>
    `;
  }
}
Build.prototype.toString = function() {
  let output = `Multiplier: ${(Math.round(this.multiplier * 10000) / 10000)}\nBonus Stats: ${this.stats.join("/")}\nArmor: ${this.armorList.join(" ")}`;
  output += `\nEnchants: ${this.enchants.join('/')}`;
  return output;
}

function getHash(stats) {
  let num = 0;
  for (let i in stats) {
    // multiply by a prime number to avoid collisions
    num *= 181;
    num += stats[i];
  }
  return num;
}

// Return a BigInt that represents the build's stats
function getStatCode(stats) {
  return stats.reduce((acc, val, i) => acc * absMaxStats[i] + BigInt(val), 0n);
}

function getMultiplierColorStr(mult) {
  return `hsl(${(mult - 1.7) * 120}, 100%, 40%)`;
}

function getFormattedMultiplierStr(mult) {
  const tens = 10 ** decimalPlaces;
  return `${Math.floor(mult)}.${(Math.floor(mult * tens) % tens).toString().padStart(decimalPlaces, "0")}`;
}

// pow/def, vit multiplier without weight
function getBaseMult(build) {
  return (BASE_HEALTH + HEALTH_PER_VIT * build.vit + build.stats[1]) / BASE_HEALTH * (build.stats[0] + BASE_ATTACK) / BASE_ATTACK;
}

// Returns modified multiplier affected by weight
function getMult(build) {
  const mult = (1 + (HEALTH_PER_VIT * build.vit + build.stats[1]) * getDefenseWeight() / BASE_HEALTH) * (1 + (build.stats[0]) * getPowerWeight() / BASE_ATTACK);
  if (includeSecondary)
    return mult * otherMult(build);
  return mult;
}

// secondary stats multiplier
function otherMult(build) {
  const modeMultiplier = 1 / (1 / MODE_BONUS + 1);
  return ((estimateMultComplex(build.stats[2]) - 1) * getSizeWeight() * 4/7 + 1) * ((1 + estimateMultComplex(build.stats[3]) * getIntensityWeight() * modeMultiplier) / (1 + getIntensityWeight() * modeMultiplier)) * ((estimateMultComplex(build.stats[4]) - 1) * getSpeedWeight() * 4/7 + 1) * ((estimateMultComplex(build.stats[5]) - 1) * getAgilityWeight() * 4/7 + 1);
}

// estimate effect of secondary stats (bc non-linear)
function estimateMultComplex(stat) {
  // return Math.pow(.0132 * Math.pow(stat, 1.176) + 1, .35) + .0552 * Math.pow(stat, .241) - .059 * Math.log(stat + 1) / Math.log(30);
  return Math.pow(.01194 * Math.pow(stat, 1.188) + 1, .3415) + .06195 * Math.pow(stat, .2992) - .0893 * Math.log(stat + 1) / Math.log(30);
}

function getExtraStats(build) {
  let statsLeft = 0;
  if (build.useEnchants)
    statsLeft += 5 * EnchantStats[0];
  if (build.useJewels)
    statsLeft += JewelStats[0] * (build.jewelSlots);
  for (const i in build.stats) {
    statsLeft -= Math.max((minStats[i] - build.stats[i]), 0) * EnchantStats[0] / EnchantStats[i];
  }
  return statsLeft;
}

// Data
const BASE_HEALTH = 968;
const HEALTH_PER_VIT = 4;
const BASE_ATTACK = 144;
const BUILD_SIZE = 100;
const ARMOR_SIZE = 200;

// Config
let MODE_BONUS = .2;
let decimalPlaces = 3;
// Unlike python script, these range from [0, 1]
const weights = [1, 1, .25, .5, .5, .4];
const minStats = [0, 0, 0, 0, 0, 0];
const maxStats = [200, 3000, 400, 400, 400, 400];
const absMaxStats = [];
let includeSecondary = true;
let logEnabled = true;

function getPowerWeight() {
  return weights[0];
}
function getDefenseWeight() {
  return weights[1];
}
function getSizeWeight() {
  return weights[2];
}
function getIntensityWeight() {
  return weights[3];
}
function getSpeedWeight() {
  return weights[4];
}
function getAgilityWeight() {
  return weights[5];
}

// Stat order: power defense size intensity speed agility
const Order = ["Amulet", "Accessory", "Boots", "Chestplate", "Enchant", "Helmet", "Jewel"];
const StatOrder = ["power", "defense", "size", "intensity", "speed", "agility"];
const Armors = [[], [], [], [], [], [], []];
const EnchantStats = [];
const JewelStats = [];

// Load data from info file into Armors. Must be called before solve()
const infoFileName = "infojewels.json";
async function getInfo() {
  const info = await fetch("/armor/" + infoFileName).then(response => response.json());
  for (const line of info) {
    const words = line.split(" ");
    const category = words[0];
    const name = words[1];
    const stats = [];
    for (let i = 2; i < 8; i++) {
      stats.push(parseInt(words[i]));
    }
    const jewels = words.length > 8 ? parseInt(words[8]) : 0;
    const armor = new Armor(name, stats, jewels);
    const index = Order.indexOf(category);
    Armors[index].push(armor);
    if (index == Order.indexOf("Jewel"))
      JewelStats.push(stats.reduce((a, b) => a + b, 0));
    if (index == Order.indexOf("Enchant"))
      EnchantStats.push(stats.reduce((a, b) => a + b, 0));
  }
  try {
    if (document) {
      absMaxStats.splice(0, absMaxStats.length);
      StatOrder.map(statName => BigInt(document.getElementById(`max-${statName}`).max)).forEach(max => absMaxStats.push(max));
    }
  }
  catch (e) {}
}

function toggleLog(input) {
  logEnabled = input.checked;
}

function log(func, ...args) {
  if (logEnabled) {
    func(...args);
  }
}