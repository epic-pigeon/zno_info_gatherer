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
    },
    deleteHeader(name) {
        delete this.headers[name];
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
        if (!this.requests.some(req => req === request)) {
            this.requests.push(request);
            this._writeFile();
        }
    },
    getRequests() {
        return [...this.requests];
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

            let thisCookie = res.headers["set-cookie"][0].split(";")[0].split("=")[1];

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

                        let authPostData = `code=${parsed.cu_pers_code}&pass=${parsed.cu_pin}`;

                        headersGenerator.setRequestHeader("cookie", `this=${thisCookie}`);
                        headersGenerator.setRequestHeader("sec-fetch-dest", "empty");
                        headersGenerator.setRequestHeader("sec-fetch-mode", "cors");
                        headersGenerator.setRequestHeader("Content-Length", Buffer.byteLength(authPostData));
                        headersGenerator.setRequestHeader("sec-fetch-site", "same-origin");
                        headersGenerator.setRequestHeader("Accept-Language", "en-US,en;q=0.9,ru-UA;q=0.8,ru;q=0.7,uk;q=0.6");
                        options = {
                            host: "zno-kharkiv.org.ua",
                            port: 443,
                            path: "/register/api/auth",
                            method: "POST",
                            headers: headersGenerator.headers,
                        };

                        let authReq = https.request(options, function () {
                            headersGenerator.setRequestHeader("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9");
                            headersGenerator.setRequestHeader("Cache-Control", "max-age=0");
                            headersGenerator.setRequestHeader("sec-fetch-dest", "document");
                            headersGenerator.setRequestHeader("sec-fetch-mode", "navigate");
                            headersGenerator.setRequestHeader("sec-fetch-user", "?1");
                            headersGenerator.setRequestHeader("upgrade-insecure-requests", "1");
                            headersGenerator.setRequestHeader("sec-fetch-site", "same-origin");
                            headersGenerator.deleteHeader("Content-Length");
                            options = {
                                host: "zno-kharkiv.org.ua",
                                port: 443,
                                path: "/register/cabinet",
                                method: "GET",
                                headers: headersGenerator.headers,
                            };
                            https.request(options, function (cabinetResponse) {
                                let chunks = [];
                                cabinetResponse.on("data", chunks.push.bind(chunks));
                                cabinetResponse.on("end", () => {
                                    zlib.gunzip(Buffer.concat(chunks), function (err, resultBuff) {
                                        if (err) {
                                            throw err;
                                        }
                                        //console.log(result.toString())
                                        let result = resultBuff.toString("utf8");
                                        //console.log(result);
                                        //let email = result.split("<th class=\"text-right\">Email</th>")[1].split()

                                        const getHeader = header => result.split(header)[1].split("</td>")[0].split(">")[1];


                                        headersGenerator.setRequestHeader("Referer", "https://zno-kharkiv.org.ua/register/cabinet");
                                        headersGenerator.deleteHeader("Cache-Control");
                                        options = {
                                            host: "zno-kharkiv.org.ua",
                                            port: 443,
                                            path: "/register/print/invite",
                                            method: "GET",
                                            headers: headersGenerator.headers,
                                        };

                                        https.request(options, function (inviteResponse) {

                                            let chunks = [];

                                            //console.log("kar");

                                            inviteResponse.on("data", chunks.push.bind(chunks));

                                            inviteResponse.on("end", () => {
                                                zlib.gunzip(Buffer.concat(chunks), function (err, inviteBuff) {
                                                    if (err) {
                                                        reject(err);
                                                        return;
                                                    }
                                                    let invite = inviteBuff.toString("utf8");
                                                   // console.log(invite);
                                                    resolve({
                                                        personalCode: parsed.cu_pers_code,
                                                        pin: parsed.cu_pin,
                                                        surname: getHeader("<th width=\"50%\" class=\"text-right\">Прізвище</th>"),
                                                        name: getHeader("<th class=\"text-right\">Ім'я</th>"),
                                                        fatherName: getHeader("<th class=\"text-right\">По-батькові</th>"),
                                                        birthday: getHeader("<th class=\"text-right\">Дата народження</th>"),
                                                        phone: getHeader("<th class=\"text-right\">Контактний телефон</th>"),
                                                        city: getHeader("<th class=\"text-right\">Місце постійного проживання</th>"),
                                                        school: getHeader("<th class=\"text-right\">Навчальний заклад</th>"),
                                                        invite
                                                    });
                                                });
                                            }).on("error", reject);

                                        }).on("error", reject).end();
                                    })
                                    //console.log(Buffer.concat(chunks).toString());
                                })
                            }).on("error", reject).end();
                        });

                        authReq.write(Buffer.from(authPostData).toString("utf8"));
                        authReq.end();
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
module.exports.RequestsSaver = RequestsSaver;