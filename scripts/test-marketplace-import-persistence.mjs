var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { processSmartInventoryImport } from "../src/server/inventoryImportCommit.ts";
import { FirestoreInventoryRepository, } from "../src/server/repositories/inventoryRepository.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
var MemoryDoc = /** @class */ (function () {
    function MemoryDoc(collection, id) {
        this.collection = collection;
        this.id = id;
    }
    MemoryDoc.prototype.get = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                data = this.collection.getData(this.id);
                return [2 /*return*/, {
                        id: this.id,
                        exists: Boolean(data),
                        data: function () { return (data ? __assign({}, data) : undefined); },
                    }];
            });
        });
    };
    MemoryDoc.prototype.set = function (data, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.collection.setData(this.id, data, (options === null || options === void 0 ? void 0 : options.merge) === true);
                return [2 /*return*/];
            });
        });
    };
    MemoryDoc.prototype.delete = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.collection.deleteData(this.id);
                return [2 /*return*/];
            });
        });
    };
    return MemoryDoc;
}());
var MemoryQuery = /** @class */ (function () {
    function MemoryQuery(collection) {
        this.filters = [];
        this.collection = collection !== null && collection !== void 0 ? collection : this;
    }
    MemoryQuery.prototype.where = function (field, _op, value) {
        var next = new MemoryQuery(this.collection);
        next.filters = __spreadArray(__spreadArray([], this.filters, true), [{ field: field, value: value }], false);
        return next;
    };
    MemoryQuery.prototype.orderBy = function () {
        return this;
    };
    MemoryQuery.prototype.get = function () {
        return __awaiter(this, void 0, void 0, function () {
            var docs;
            var _this = this;
            return __generator(this, function (_a) {
                docs = this.collection
                    .entries()
                    .filter(function (_a) {
                    var data = _a[1];
                    return _this.filters.every(function (filter) { return data[filter.field] === filter.value; });
                })
                    .map(function (_a) {
                    var id = _a[0], data = _a[1];
                    return ({
                        id: id,
                        exists: true,
                        data: function () { return (__assign({}, data)); },
                    });
                });
                return [2 /*return*/, { docs: docs }];
            });
        });
    };
    return MemoryQuery;
}());
var MemoryCollection = /** @class */ (function (_super) {
    __extends(MemoryCollection, _super);
    function MemoryCollection(name) {
        var _this = _super.call(this) || this;
        _this.name = name;
        _this.docs = new Map();
        return _this;
    }
    MemoryCollection.prototype.doc = function (id) {
        return new MemoryDoc(this, id);
    };
    MemoryCollection.prototype.getData = function (id) {
        return this.docs.get(id);
    };
    MemoryCollection.prototype.setData = function (id, data, merge) {
        var _a;
        var prev = merge ? (_a = this.docs.get(id)) !== null && _a !== void 0 ? _a : {} : {};
        this.docs.set(id, __assign(__assign({}, prev), data));
    };
    MemoryCollection.prototype.deleteData = function (id) {
        this.docs.delete(id);
    };
    MemoryCollection.prototype.entries = function () {
        return __spreadArray([], this.docs.entries(), true);
    };
    return MemoryCollection;
}(MemoryQuery));
var MemoryFirestore = /** @class */ (function () {
    function MemoryFirestore() {
        this.collections = new Map();
    }
    MemoryFirestore.prototype.collection = function (name) {
        var existing = this.collections.get(name);
        if (existing)
            return existing;
        var created = new MemoryCollection(name);
        this.collections.set(name, created);
        return created;
    };
    return MemoryFirestore;
}());
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var db, repository, owner, commit, importedId, request1Listings, request2Repo, request2Listings, persisted, publicDto, chatCardFetch;
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    db = new MemoryFirestore();
                    repository = new FirestoreInventoryRepository(db);
                    owner = {
                        dealerId: "thor-auto",
                        ownerId: "owner-thor-auto",
                        ownerName: "Thor Auto",
                        ownerPhone: "0812345678",
                        showroomName: "Thor Auto",
                    };
                    return [4 /*yield*/, processSmartInventoryImport({
                            published: [
                                {
                                    sourceRowIndex: 1,
                                    importStatus: "valid",
                                    title: "Toyota Vios ปี 2021",
                                    brand: "Toyota",
                                    model: "Vios",
                                    year: 2021,
                                    price: 369000,
                                    mileage: 127101,
                                    fuelType: "petrol",
                                    description: "รถสภาพดี VIN: JT2BG22K1V0123456",
                                    sourceImageUrls: [
                                        "https://drive.google.com/uc?export=download&id=AAA111bbb222CCC333",
                                        "https://drive.google.com/uc?export=download&id=DDD444eee555FFF666",
                                    ],
                                    skipSourceImageDownload: true,
                                    registrationProvince: "กรุงเทพมหานคร",
                                    licensePlateMasked: "2ขร***",
                                    licensePlateFull: "2ขร3120",
                                    rawRow: {
                                        ทะเบียน: "2ขร3120",
                                        จังหวัดทะเบียน: "กรุงเทพมหานคร",
                                    },
                                },
                            ],
                            drafts: [],
                        }, owner, { inventoryRepository: repository })];
                case 1:
                    commit = _j.sent();
                    assert(commit.success, "commit should succeed");
                    assert(commit.importedCount === 1, "must import one listing");
                    assert(commit.persistenceBackend === "firestore", "commit should persist through firestore repository");
                    importedId = (_a = commit.imported[0]) === null || _a === void 0 ? void 0 : _a.id;
                    assert(Boolean(importedId), "commit should return imported id");
                    return [4 /*yield*/, repository.listings.listPublished()];
                case 2:
                    request1Listings = _j.sent();
                    assert(request1Listings.some(function (row) { return row.id === importedId; }), "listing should be visible immediately after commit");
                    request2Repo = new FirestoreInventoryRepository(db);
                    return [4 /*yield*/, request2Repo.listings.listPublished()];
                case 3:
                    request2Listings = _j.sent();
                    persisted = request2Listings.find(function (row) { return row.id === importedId; });
                    assert(Boolean(persisted), "listing should survive fresh repository request");
                    assert((persisted === null || persisted === void 0 ? void 0 : persisted.listingStatus) === "published", "listing must stay published");
                    assert(((_c = (_b = persisted === null || persisted === void 0 ? void 0 : persisted.images) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) > 0, "listing must keep persisted images field");
                    assert(String((_d = persisted === null || persisted === void 0 ? void 0 : persisted.licensePlateMasked) !== null && _d !== void 0 ? _d : "").trim().length > 0, "licensePlateMasked must persist with non-empty value");
                    assert((persisted === null || persisted === void 0 ? void 0 : persisted.registrationProvince) === "กรุงเทพมหานคร", "registrationProvince must persist");
                    publicDto = toPublicMarketplaceCarDto(persisted);
                    assert(String((_e = publicDto.ownerPhone) !== null && _e !== void 0 ? _e : "") === "", "public dto must redact ownerPhone");
                    assert(!("licensePlateFull" in publicDto), "public dto must hide full plate");
                    assert(!("vin" in publicDto), "public dto must hide vin");
                    assert(String((_f = publicDto.licensePlateMasked) !== null && _f !== void 0 ? _f : "").trim().length > 0, "public dto should keep masked plate only");
                    return [4 /*yield*/, request2Repo.listings.getById(importedId)];
                case 4:
                    chatCardFetch = _j.sent();
                    assert(Boolean(chatCardFetch), "chat card source fetch should resolve persisted listing");
                    assert(((_h = (_g = chatCardFetch === null || chatCardFetch === void 0 ? void 0 : chatCardFetch.images) === null || _g === void 0 ? void 0 : _g.length) !== null && _h !== void 0 ? _h : 0) > 0, "chat card source should include persisted images");
                    console.log("PASS test-marketplace-import-persistence");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
