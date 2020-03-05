//const sslCertificate = require('get-ssl-certificate');

const gather = require("./gatherer");
const http = require("http");
const url = require("url");
const fs = require("fs");
const crypto = require("crypto");

http.createServer((req, res) => {
    let {query} = url.parse("http://localhost:1337" + req.url);
    let parsedQuery = {};
    if (query) {
        parsedQuery = Object.assign({},
            ...query.split("&").map(val => {
                if (val.indexOf("=") === -1) {
                    let result = {};
                    result[decodeURIComponent(val)] = "";
                    return result;
                } else {
                    let key = decodeURIComponent(val.split("=")[0]);
                    let value = decodeURIComponent(val.split("=").slice(1).join("="));
                    let result = {};
                    result[key] = value;
                    return result;
                }
            })
        );
    }
    if (parsedQuery.email) {
        //console.log(parsedQuery.email);
        gather(parsedQuery.email).then(result => {
            res.writeHead(200, {});
            res.end(JSON.stringify({success: true, ...result}));
        }).catch(e => {
            res.writeHead(200, {});
            res.end(JSON.stringify({success: false, message: e.toString()}));
        })
    } else if (parsedQuery.password                                                                    // хер те а не пароль)))))))))))
        && crypto.createHash("sha256").update(parsedQuery.password).digest("hex") === "b4feed5afeb6d1b444f37bbee7c94008cf672293aa12e2aebce8b2788da7346d") {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(gather.RequestsSaver.getRequests().join("<br>"))
    } else {
        res.writeHead(200, {"Content-Type": "text/html"});
        fs.readFile("./index.html", "UTF-8", (err, result) => {
            if (err) {
                console.log(err);
                return;
            }
            res.end(result.toString());
        });
    }
}).listen(1337);
