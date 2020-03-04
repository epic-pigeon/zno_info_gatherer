const https = require("https");
const path = require("path");
const zlib = require("zlib");
const fs = require("fs");

//const KeyEncoder = require('key-encoder').default;
//let keyEncoder = new KeyEncoder('secp256k1');

const rootCas = require('ssl-root-cas').create();

let HeadersGenerator = () => ({
    headers: {},
    setRequestHeader(name, value) {
        this.headers[name] = value;
    }
});

const RequestsSaver = {
    filename: "./requests",
    load() {
        if (fs.existsSync(this.filename)) {
            this.requests = fs.readFileSync("requests", "UTF-8").toString().split("\n");
        } else {
            this.requests = [];
            fs.writeFileSync(this.filename, "", "UTF-8");
        }
    },
    save(request) {
        this.requests.push(request);
        this._writeFile();
    },
    _writeFile() {
        fs.writeFileSync(this.filename, this.requests.join("\n"), "UTF-8");
    }
};

RequestsSaver.load();

rootCas.addFile(path.resolve(__dirname, 'intermediate.pem'));

https.globalAgent.options.ca = rootCas;

function gather(email) {
    return new Promise(((resolve, reject) => {
        let payload = "email=" + encodeURIComponent(email);

        let headersGenerator = HeadersGenerator();

        headersGenerator.setRequestHeader("Accept", "application/json, text/javascript, */*;q=0.01");
        headersGenerator.setRequestHeader("Accept-Encoding", "gzip, deflate, br");
        headersGenerator.setRequestHeader("Accept-Language", "en-US,en;q=0.5");
        headersGenerator.setRequestHeader("Cache-Control", "no-cache");
        headersGenerator.setRequestHeader("Connection", "keep-alive");
        headersGenerator.setRequestHeader("Content-Length", Buffer.byteLength(payload, "utf8"));
        headersGenerator.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        headersGenerator.setRequestHeader("Host", "zno-kharkiv.org.ua");
        headersGenerator.setRequestHeader("Origin", "https://zno-kharkiv.org.ua");
        headersGenerator.setRequestHeader("Pragma", "no-cache");
        headersGenerator.setRequestHeader("Referer", "https://zno-kharkiv.org.ua/register");
        headersGenerator.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        let options = {
            host: "zno-kharkiv.org.ua",
            port: 443,
            path: "/register/api/recovery",
            method: "POST",
            headers: headersGenerator.headers,
            //key: keyEncoder.encodePublic(certificate.pubkey.toString('hex'), "raw", "pem"),
            //cert: certificate.pemEncoded,
        };

        let req = https.request(options, function (res) {
            //console.log("statusCode: ", res.statusCode);
            //console.log("headers: ", res.headers);

            if (res.statusCode !== 200) reject(new Error("Bad status code " + res.statusCode));

            //res.setEncoding("raw");

            let chunks = [];

            res.on("data", chunks.push.bind(chunks));
            res.on("end", () => {
                let data = Buffer.concat(chunks);
                //console.log(data);
                zlib.gunzip(data, function (err, result) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    let parsed = JSON.parse(result.toString());
                    if (parsed.status === "success") {
                        RequestsSaver.save(email);
                        resolve({
                            personalCode: parsed.cu_pers_code,
                            pin: parsed.cu_pin
                        });
                    } else reject(new Error("Server error or no user found"));
                });
            });
            res.on("error", reject)
        }).on("error", reject);

        req.write(Buffer.from(payload).toString("utf8"));
        req.end();
    }));
}

module.exports = gather;