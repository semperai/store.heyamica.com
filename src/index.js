"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var express_1 = require("express");
var dotenv = require("dotenv");
var client_s3_1 = require("@aws-sdk/client-s3");
var supabase_js_1 = require("@supabase/supabase-js");
var cors_1 = require("cors");
var multer_1 = require("multer");
dotenv.config();
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
var upload = (0, multer_1.default)();
app.get("/", function (req, res) {
    res.send("This site available at https://github.com/semperai/store.heyamica.com");
});
app.post("/upload", upload.fields([{ name: 'files' }]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var queryType, supabase, client, files, file, _i, files_1, f, buf, _a, _b, key, invalidFile, headCommand, response_1, error_1, uploadCommand, error, response, error_2;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                queryType = (_c = req.query.type) !== null && _c !== void 0 ? _c : "none";
                res.setHeader("Content-Type", "application/json");
                supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
                _d.label = 1;
            case 1:
                _d.trys.push([1, 9, , 10]);
                client = new client_s3_1.S3Client({
                    endpoint: process.env.AWS_ENDPOINT,
                    region: process.env.AWS_REGION
                });
                files = req.files['files'];
                console.log('files', files);
                if (files === null) {
                    res.status(400);
                    res.json({ error: "No file provided" });
                    return [2 /*return*/];
                }
                file = null;
                // we get the last file uploaded due to... reasons
                // (filepond uploads metadata first, and we only want the last one)
                for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                    f = files_1[_i];
                    file = f;
                }
                if (file === null) {
                    res.status(400);
                    res.json({ error: "No file found" });
                    return [2 /*return*/];
                }
                _b = (_a = Buffer).from;
                return [4 /*yield*/, file.arrayBuffer()];
            case 2:
                buf = _b.apply(_a, [_d.sent()]);
                key = (0, crypto_1.createHash)('sha256').update(buf).digest('hex');
                invalidFile = false;
                switch (queryType) {
                    case "bgimg": {
                        if (
                        // jpg
                        !buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) &&
                            // png
                            !buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
                            invalidFile = true;
                        }
                        break;
                    }
                    case "vrm": {
                        if (!buf.subarray(0, 4).equals(Buffer.from([0x67, 0x6c, 0x54, 0x46]))) {
                            invalidFile = true;
                        }
                        break;
                    }
                    default: {
                        invalidFile = true;
                        break;
                    }
                }
                if (invalidFile) {
                    res.status(400);
                    res.json({ error: "Invalid file type" });
                    return [2 /*return*/];
                }
                headCommand = new client_s3_1.HeadObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key,
                });
                _d.label = 3;
            case 3:
                _d.trys.push([3, 5, , 6]);
                return [4 /*yield*/, client.send(headCommand)];
            case 4:
                response_1 = _d.sent();
                res.status(200);
                res.json({
                    message: "File already exists",
                    key: key,
                    response: response_1,
                });
                return [2 /*return*/];
            case 5:
                error_1 = _d.sent();
                return [3 /*break*/, 6];
            case 6:
                uploadCommand = new client_s3_1.PutObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key,
                    Body: buf,
                });
                return [4 /*yield*/, supabase.from("files").insert({
                        type: queryType,
                        hash: key,
                    })];
            case 7:
                error = (_d.sent()).error;
                if (error) {
                    res.status(500);
                    res.json({ error: "Database inaccessible" });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, client.send(uploadCommand)];
            case 8:
                response = _d.sent();
                res.status(201);
                res.json({
                    message: "File uploaded successfully",
                    key: key,
                    response: response,
                });
                return [2 /*return*/];
            case 9:
                error_2 = _d.sent();
                res.status(500);
                res.json({ error: error_2.message });
                return [2 /*return*/];
            case 10: return [2 /*return*/];
        }
    });
}); });
app.listen((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000, function () {
    var _a;
    console.log("Listening on port ".concat((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000));
});
