document.onreadystatechange = function () {
    if (document.readyState == "interactive") {
        onLoad();
    }
}

function onLoad() {
    document.getElementById("player").style.display = "none";
    document.getElementById("convertOptions").style.display = "none";
    document.getElementById("loopVideo").checked = loopVideo;
    toggleDurationControls()
}

var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";

var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player, loopVideo = true;
var videoId, startTime = 0, endTime = 0;

function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        width: "800",
        height: "450",
        playerVars: {
            "autoplay": 1,
            "loop": 1,
            "modestbranding": 1
        },
        events: {
            "onStateChange": onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        setInterval(timeUpdated, 100);
    }
    else if (event.data == YT.PlayerState.ENDED) {
        clearInterval(timeUpdated);

        if (loopVideo) {
            player.playVideo();
            player.seekTo(startTime);
        }
    }
}

function timeUpdated() {
    let currentTime = player.getCurrentTime();

    if (!currentTime) {
        return;
    }

    document.getElementById("currentTime").innerHTML = formatTime(currentTime);
}

function formatTime(time) {
    const hours = ~~(time / 3600);
    const minutes = ~~((time % 3600) / 60);
    const seconds = ~~(time % 60);
    const milliseconds = (time - ~~time).toFixed(1).split(".")[1];

    let str = "";

    if (hours > 0) {
        str += (hours < 10 ? "0" : "") + hours + ":";
    }

    str += (minutes < 10 ? "0" : "") + minutes + ":";
    str += (seconds < 10 ? "0" : "") + seconds + ".";
    str += milliseconds;

    return str;
}

function startButtonClicked() {
    let link = document.getElementById("link").value;

    if (link == "") {
        document.getElementById("convertResults").innerHTML = "Please insert link to continue";
        return;
    }
    
    if (typeof player.loadVideoById != "function") {
        document.getElementById("convertResults").innerHTML = "Please try again in few seconds. Video player is still loading...";
        return;
    }

    document.getElementById("convertResults").innerHTML = "";

    videoId = link.replace(new RegExp(".*v=(.{11}).*"), "$1")
                  .replace(new RegExp(".*/v/(.{11}).*"), "$1")
                  .replace(new RegExp(".*/watch/(.{11}).*"), "$1")
                  .replace(new RegExp(".*/shorts/(.{11}).*"), "$1")
                  .replace(new RegExp(".*/embed/(.{11}).*"), "$1")
                  .replace(new RegExp(".*youtu.be/(.{11}).*"), "$1");

    if (document.getElementById("durationControls").checked) {
        setPlayerTime();
    }
    else {
        player.loadVideoById(videoId);
    }

    var playerEl = document.getElementById("player");
    playerEl.style.display = "";
}

function convertButtonClicked() {
    var convertOptions = document.getElementById("convertOptions");
    convertOptions.style.display = convertOptions.style.display == "none" ? "" : "none";
}

function toggleDurationControls() {
    let checked = document.getElementById("durationControls").checked;
    toggleDivChildElements(document.getElementById("startTimeControls"), checked);
    toggleDivChildElements(document.getElementById("endTimeControls"), checked);

    if (!player) {
        return;
    }

    if (checked) {
        setPlayerTime();
    }
    else {
        startTime = endTime = 0;
        player.loadVideoById(videoId);
    }
}

function toggleDivChildElements(div, checked) {
    div.disabled = !checked;

    var elements = Array.from(div.children);
    elements.forEach(function(el) {
        if (el.matches("label")) {
            el.style.color = checked ? "black" : "gray";
        }

        el.disabled = !checked;
    });
}

function toggleLoopVideo() {
    loopVideo = document.getElementById("loopVideo").checked;

    if (loopVideo && player && (player.getPlayerState() == YT.PlayerState.ENDED || (endTime > 0 && player.getCurrentTime() >= endTime))) {
        if (document.getElementById("durationControls").checked) {
            setPlayerTime();
        }
        else {
            player.loadVideoById(videoId);
        }
    }
}

function handleEnter(event, func) {
    if (event.key == "Enter") {
        func();
    }
}

function setPlayerTime() {
    if (!document.getElementById("durationControls").checked) {
        return;
    }

    startTime = parseFloat(document.getElementById("startTime").value);
    endTime = parseFloat(document.getElementById("endTime").value);

    if (!startTime && !endTime) {
        return;
    }

    if (startTime > endTime) {
        startTime = startTime + endTime;
        endTime = startTime - endTime;
        startTime = startTime - endTime;
    }

    player.loadVideoById({
        videoId: videoId,
        startSeconds: startTime,
        endSeconds: endTime
    });
}

function convert(format, type) {
    if (!videoId) {
        document.getElementById("convertResults").innerHTML = "Please insert link and click \"Start\". The video player should be visible in order to start the conversion";
        return;
    }

    fetch("/convert", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
                videoId: videoId,
                startTime: startTime,
                endTime: endTime,
                format: format,
                type: type
        })
    }).then(res => handleResponse(res)).catch(err => console.error("Error: ", err));

    document.getElementById("convertResults").innerHTML = "Please wait. Conversion is in progress...";
}

function download() {
    fetch("/download").then(res => handleResponse(res)).catch(err => console.error("Error: ", err));
}

async function handleResponse(res) {
    if (!res.ok) {
        const json = await res.json();
        document.getElementById("convertResults").innerHTML = json["message"];
        return;
    }

    const data = await res.blob();
    const blob = new Blob([data], { type: res.headers.get("content-type") });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    const contentDisposition = res.headers.get("content-disposition");
    let fileName = "unknown";

    if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);

        if (fileNameMatch.length === 2) {
            fileName = fileNameMatch[1];
        }
    }

    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);

    document.getElementById("convertResults").innerHTML = "Conversion completed. Please click \"Download\", if download didn't start automatically";
}
