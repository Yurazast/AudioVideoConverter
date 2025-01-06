var express = require("express");
var app = express();
var fs = require("fs");
var path = require("path");
var exec = require("child_process").exec;

const HOST = "0.0.0.0";
const PORT = 8080;

var retryCount = 0;
var isConverting = false;

function execute(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            if (stderr) {
                return reject(stderr);
            }
            resolve(stdout);
        })
    })
}

function parseJSON(json) {
    let videoId = json["videoId"];
    let startTime = json["startTime"];
    let endTime = json["endTime"];
    let format = json["format"];
    let type = json["type"];

    if (!videoId) {
        throw "Unable to get videoId from JSON";
    }

    console.log("Converting video \"" + videoId + "\"" +
        (startTime && endTime ? " (start: " + startTime + "s, end: " + endTime + "s)" :
                    startTime ? " (start: " + startTime + "s)" :
                                " (end: " + endTime + "s)") +
        " to " + format.toUpperCase() + " format...")

    let command = "./AudioVideoConverter.sh -y " + videoId;

    if (format) {
        command += " -f " + format;
    }

    if (type) {
        command += " -t " + type;
    }

    if (startTime && endTime) {
        command += " -s " + Math.min(startTime, endTime) + " -e " + Math.max(startTime, endTime);
    }
    else if (startTime) {
        command += " -s " + startTime;
    }
    else if (endTime) {
        command += " -e " + endTime;
    }

    return command;
}

async function sendLastProcessedFile(res) {
    let lastProcessedFile = await execute("ls -t | grep -E '.*\.mp3|.*\.mp4' | head -n 1");

    if (lastProcessedFile == "") {
        res.status(500).send({ message: "No files are available to download" });
        return;
    }

    console.log("Sending \"" + lastProcessedFile.trim() + "\"...\n");
    res.download(lastProcessedFile.trim(), { root: __dirname });
}

app.use(express.json());

app.get("/", async (req, res) => {
    fs.readFile("./AudioVideoConverter.html", function (error, data) {
        res.end(data);
    });
});

app.get("/download", async (req, res) => {
    try {
        sendLastProcessedFile(res);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error });
    }
});

app.post("/convert", async (req, res) => {
    try {
        if (isConverting) {
            retryCount++;
            res.status(400).send({ message: "Please wait" + "!".repeat(retryCount) + " Conversion is already in progress..." });
            return;
        }

        isConverting = true;

        let json = req.body;
        let command = parseJSON(json);

        await execute(command);

        sendLastProcessedFile(res);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error });
    }

    isConverting = false;
    retryCount = 0;
});

app.use((req, res, next) => {
    fs.readFile("./" + req.url, function (error, data) {
        res.end(data);
    });
});

app.listen(PORT, HOST, () => {
    console.log("Server is listening on " + HOST + ":" + PORT + "\n");
});
