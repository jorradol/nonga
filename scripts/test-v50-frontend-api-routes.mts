import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

console.log("=== Nong A v5.0 Frontend API Route Smoke ===");

const myListingsView = read("src/components/MyListingsView.tsx");
const editListingModal = read("src/components/listings/EditListingModal.tsx");
const sellingForm = read("src/components/cars/create/SellingFormContainer.tsx");
const myListingsApi = read("src/services/listings/myListingsApi.ts");

assert(
  myListingsView.includes("listingApiScope"),
  "MyListingsView should pass central listing API scope"
);
assert(
  myListingsView.includes("useDealerPortal"),
  "MyListingsView should derive dealer headers from useDealerPortal"
);
assert(
  !myListingsView.includes('"/api/my/listings"') &&
    !myListingsView.includes("'/api/my/listings'"),
  "MyListingsView should not directly reference legacy /api/my/listings"
);
assert(
  editListingModal.includes("listingApiScope"),
  "EditListingModal should use central listing API scope for image saves"
);
assert(
  !sellingForm.includes('fetch("/api/cars"') &&
    !sellingForm.includes("fetch('/api/cars'"),
  "SellingFormContainer should not fetch legacy /api/cars directly"
);
assert(
  sellingForm.includes("createLegacyMarketplaceListing"),
  "SellingFormContainer should use the centralized compatibility wrapper"
);
assert(
  myListingsApi.includes("fetchDealerInventory") &&
    myListingsApi.includes("patchDealerInventory") &&
    myListingsApi.includes("hideDealerInventory") &&
    myListingsApi.includes("deleteDealerInventory"),
  "myListingsApi should use secure dealer inventory APIs when dealer scope is present"
);
assert(
  myListingsApi.includes("uploadListingImagesApi") &&
    myListingsApi.includes('"inventory"'),
  "myListingsApi should use dealer-scoped image upload for dealer inventory"
);
assert(
  myListingsApi.includes("function ownerHeaders") &&
    myListingsApi.includes("Compatibility path"),
  "legacy owner headers should remain isolated to the compatibility service"
);

console.log("PASS MyListingsView uses dealer-aware service scope");
console.log("PASS EditListingModal image saves use central scope");
console.log("PASS SellingFormContainer uses compatibility wrapper");
console.log("PASS myListingsApi centralizes dealer and legacy paths");
