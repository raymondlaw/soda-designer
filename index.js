const fs = require("fs");
const url = require("url");
const http = require("http");

const Jimp = require("jimp");

const port = 3000;
const host = "localhost";
const cache_enabled = true;

const hexToRgb = function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return (
        result
        ? {r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)}
        : {r: 255, g: 255, b: 255}
    );
};

const open_assets = function () {
    const can = {
        lid: {path: "assets/can/can-lid.png"},
        body: {path: "assets/can/can-body.png"},
        label: {path: "assets/can/can-label.png"}
    };
    const flavors = [
        {id: "apple", path: "assets/flavor/apple.png", x: 120, y: 265},
        {id: "banana", path: "assets/flavor/banana.png", x: 80, y: 285},
        {id: "cherry", path: "assets/flavor/cherry.png", x: 100, y: 250},
        {id: "coconut", path: "assets/flavor/coconut.png", x: 110, y: 270},
        {id: "crab", path: "assets/flavor/crab.png", x: 83, y: 305},
        {id: "grape", path: "assets/flavor/grape.png", x: 93, y: 268},
        {id: "mango", path: "assets/flavor/mango.png", x: 100, y: 295},
        {id: "orange", path: "assets/flavor/orange.png", x: 90, y: 265},
        {id: "watermelon", path: "assets/flavor/watermelon.png", x: 75, y: 280}
    ];
    let assets_read = 0;
    const open_asset = function (asset) {
        Jimp.read(asset.path, function (err, resource) {
            if (err) {
                throw err;
            }
            asset.resource = resource;
            assets_read += 1;
            if (assets_read === flavors.length + 3) {
                const valid_flavors = flavors.map((x) => x.id);
                create_server(can, flavors, valid_flavors);
            }
        });
    };
    flavors.forEach(open_asset);
    Object
        .keys(can)
        .forEach((key) => open_asset(can[key]));
};

const create_server = function (can, flavors, valid_flavors) {
    const new_connection = function (req, res) {
        if (req.url === "/") {
            res.writeHead(200, {"Content-Type": "text/html"});
            fs
                .createReadStream("./html/index.html")
                .pipe(res);
        }
        else if (req.url.startsWith("/image-credits.txt")) {
            res.writeHead(200, {"Content-Type": "text/plain"});
            fs
                .createReadStream("./assets/image-credits.txt")
                .pipe(res);
        }
        else if (req.url.startsWith("/design")) {
            let specifications = url.parse(req.url, true).query;
            let color = hexToRgb(specifications.color);
            let user_flavor = specifications.flavor;
            let i = valid_flavors.indexOf(user_flavor);
            if (i !== -1) {
                let filename = `./tmp/${flavors[i].id}-${color.r}-${color.g}-${color.b}.png`;
                fs.access(filename, fs.constants.R_OK, function (file_does_not_exist) {
                    if (file_does_not_exist || !cache_enabled) {
                        create_can(can, color, flavors[i], filename, res);
                    }
                    else {
                        console.log("Cache Hit!");
                        deliver_can(filename, res);
                    }
                });
            }
            else {
                res.writeHead(404);
                res.end();
            }
        }
        else {
            res.writeHead(404);
            res.end();
        }
    };
    const server = http.createServer(new_connection);
    server.listen(port, host);
    console.log(`Now Listening on ${host}:${port}`);
};

const create_can = function (can, color, flavor, filename, res) {
    let new_can = can.body.resource.clone();
    let colored_can = new_can.color([
        {apply: "red", params: [color.r]},
        {apply: "green", params: [color.g]},
        {apply: "blue", params: [color.b]}
    ]);
    can.lid.resource
        .blit(colored_can, 0, 0)
        .blit(can.label.resource, 40, 210)
        .blit(flavor.resource, flavor.x , flavor.y)
        .write(filename, () => deliver_can(filename, res));
};

const deliver_can = function (filename, res) {
    res.writeHead(200, {"Content-Type": "image/png"});
    fs
        .createReadStream(filename)
        .pipe(res);
};

open_assets();