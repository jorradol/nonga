import fs from "fs";

const cars = JSON.parse(
  fs.readFileSync("data/marketplace-inventory.json", "utf8")
);
let mismatches = 0;
for (const c of cars) {
  if (!Array.isArray(c.images)) continue;
  for (const u of c.images) {
    if (!String(u).startsWith("/storage/listings/")) continue;
    const m = String(u).match(/^\/storage\/listings\/([^/]+)\//);
    if (m && m[1] !== c.id) {
      mismatches++;
      console.log("MISMATCH", c.id, c.brand, c.model, "pathCar", m[1], u);
    }
  }
}
console.log("Total cars:", cars.length, "path mismatches:", mismatches);
