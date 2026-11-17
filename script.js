let bannerBlockStart = 60;
let bannerSharpenMs = 1500;

let bannerWaiting = [];
let bannerColorWaitMs = 4000;
let colorTimer = null;

function colorizeBanners() {
    document.querySelectorAll(".row.playing").forEach(function (row) {
        row.classList.add("colored");
    });
}

function scheduleColor() {
    clearTimeout(colorTimer);
    colorTimer = setTimeout(colorizeBanners, bannerSharpenMs + bannerColorWaitMs);
}

function introIsOver() {
    let body = document.body;
    return !body.classList.contains("intro-on") || body.classList.contains("intro-done");
}

function runBannerQueue() {
    if (bannerWaiting.length === 0 || !introIsOver()) {
        return;
    }
    let ready = bannerWaiting;
    bannerWaiting = [];
    ready.forEach(function (banner) {
        banner.start();
    });
}

function setupBanner(row, canvas, img, order) {
    let ctx = canvas.getContext("2d");
    let small = document.createElement("canvas");
    let smallCtx = small.getContext("2d");
    let frameId = null;
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function draw(block) {
        let w = canvas.width;
        let h = canvas.height;
        if (block <= 1) {
            ctx.drawImage(img, 0, 0, w, h);
            return;
        }
        small.width = Math.max(1, Math.ceil(w / block));
        small.height = Math.max(1, Math.ceil(h / block));
        smallCtx.imageSmoothingQuality = "high";
        smallCtx.drawImage(img, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, w, h);
    }

    function start() {
        row.classList.add("playing");
        cancelAnimationFrame(frameId);
        if (reduceMotion) {
            draw(1);
            return;
        }
        draw(bannerBlockStart);
        let startTime = performance.now();
        function frame(now) {

            let p = Math.max(0, Math.min((now - startTime) / bannerSharpenMs, 1));

            draw(Math.max(1, Math.round(bannerBlockStart * (1 - p) * (1 - p))));
            if (p < 1) {
                frameId = requestAnimationFrame(frame);
            }
        }
        frameId = requestAnimationFrame(frame);
    }

    function stop() {
        cancelAnimationFrame(frameId);
        row.classList.remove("playing");
    }

    function init() {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        draw(reduceMotion ? 1 : bannerBlockStart);
    }
    if (img.complete && img.naturalWidth > 0) {
        init();
    } else {
        img.addEventListener("load", init);
    }

    if (window.matchMedia("(hover: none)").matches) {

        let observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.intersectionRatio >= 0.5) {
                    observer.unobserve(row);
                    bannerWaiting.push({ order: order, start: function () {
                        start();
                        scheduleColor();
                    } });

                    setTimeout(runBannerQueue, 150);
                }
            });
        }, { threshold: [0.5] });
        observer.observe(row);
    } else {
        row.addEventListener("mouseenter", start);
        row.addEventListener("mouseleave", stop);
    }
}

function makeRow(cells, banner, altText, url, threshold, order) {

    let row = document.createElement("div");
    row.className = "row grid";

    let cellClasses = ["col-title", "col-number", "col-date", "col-words"];

    for (let i = 0; i < cells.length; i++) {
        let cell = document.createElement("div");
        cell.className = cellClasses[i];

        if (i === 0 && url) {

            let link = document.createElement("a");
            link.href = url;
            link.textContent = cells[i];
            cell.appendChild(link);
        } else {
            cell.textContent = cells[i];
        }

        row.appendChild(cell);
    }

    if (banner) {
        let wrap = document.createElement("div");
        wrap.className = "banner-wrap";

        let frame = document.createElement("div");
        frame.className = "banner-frame";
        if (threshold !== undefined) {
            frame.style.setProperty("--threshold", threshold);
        }

        let canvas = document.createElement("canvas");
        canvas.className = "banner-threshold";
        canvas.setAttribute("aria-hidden", "true");

        let img = document.createElement("img");
        img.className = "banner-color";
        img.src = banner;
        img.alt = altText;

        frame.appendChild(canvas);
        frame.appendChild(img);
        wrap.appendChild(frame);
        row.appendChild(wrap);

        setupBanner(row, canvas, img, order);
    }

    return row;
}

function buildTable() {
    let archive = document.getElementById("archive");
    archive.innerHTML = "";

    for (let i = 0; i < issues.length; i++) {
        let issue = issues[i];

        let row = makeRow(
            [issue.title, issue.number, issue.date, issue.wordCount],
            issue.banner,
            issue.title,
            issue.url,
            issue.threshold,
            i
        );
        archive.appendChild(row);
    }
}

buildTable();

let phrases = [
    ["EVERY", "FRIDAY"],
    ["A SPECTRE", "IS", "HAUNTING", "THE", "INTERNET"],
    ["A", "NEWSLETTER", "BY", "GÜLNISA"],
    ["INTERNET", "CULTURE", "CRITICISM", "AND", "MORE"]
];

let mantisDepth = 0.5;
let areaPerCluster = 90000;
let minClusters = 5;
let letterStep = 1.5;
let columnStep = 1.9;
let maxStagger = 2.5;
let smallScreenScale = 0.6;
let bitmapScale = 1;
let farSize = 10;
let nearSize = 26;
let farSpeed = 0.25;
let nearSpeed = 1.8;
let farAlpha = 0.25;
let fallSpeed = 90;

let rainChoice = new URLSearchParams(window.location.search).get("rain");
let rainMode = rainChoice === "plain" ? null : (rainChoice || "b");
let glitchLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/:*+<>";

let scrollPush = 0.6;
let maxUpSpeed = 120;
let maxDownSpeed = 1500;

function lerp(a, b, p) {
    return a + (b - a) * p;
}

function makeCluster(w, h) {
    let depth = Math.random();
    let scale = window.innerWidth <= 800 ? smallScreenScale : 1;
    let size = lerp(farSize, nearSize, depth) * scale;
    let words = phrases[Math.floor(Math.random() * phrases.length)];

    let columns = [];
    let rows = 0;
    for (let i = 0; i < words.length; i++) {
        let offset = Math.random() * maxStagger;
        columns.push({ text: words[i], offset: offset });
        rows = Math.max(rows, offset + words[i].length);
    }

    let width = size + (words.length - 1) * columnStep * size;
    let height = rows * letterStep * size;

    let bitmap = document.createElement("canvas");
    bitmap.width = Math.ceil(width * bitmapScale);
    bitmap.height = Math.ceil(height * bitmapScale);

    let cluster = {
        x: Math.random() * Math.max(w - width, 0),
        y: Math.random() * (h + height) - height,
        width: width,
        height: height,
        bitmap: bitmap,
        columns: columns,
        depth: depth,
        size: size,
        speedScale: lerp(farSpeed, nearSpeed, depth),
        alpha: lerp(farAlpha, 1, depth),
        flicker: null
    };
    drawClusterBitmap(cluster);
    return cluster;
}

function drawClusterBitmap(c) {
    let bctx = c.bitmap.getContext("2d");
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, c.bitmap.width, c.bitmap.height);
    bctx.scale(bitmapScale, bitmapScale);
    bctx.font = c.size + "px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.fillStyle = "black";
    for (let j = 0; j < c.columns.length; j++) {
        let column = c.columns[j];
        let x = c.size / 2 + j * columnStep * c.size;
        let last = column.text.length - 1;
        for (let k = 0; k <= last; k++) {
            let letter = column.text[k];
            if (letter === " ") continue;
            if (c.flicker && c.flicker.column === j && c.flicker.letter === k) {
                letter = c.flicker.character;
            }
            if (rainMode) {

                bctx.globalAlpha = k === last ? 1 : 0.12 + 0.6 * Math.pow(k / last, 1.5);
            }
            bctx.fillText(letter, x, (column.offset + k + 0.5) * letterStep * c.size);
        }
    }
    bctx.globalAlpha = 1;
}

function startIntro() {
    let intro = document.getElementById("intro");
    let nearCanvas = document.getElementById("ascii");
    let farCanvas = document.getElementById("ascii-far");
    let mantis = document.getElementById("mantis");
    let floatTitle = document.getElementById("float-title");
    let spacer = document.getElementById("intro-spacer");

    let skip = !document.body.classList.contains("intro-on") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip) {
        intro.remove();
        floatTitle.remove();
        spacer.remove();
        document.body.classList.remove("intro-on");
        return;
    }

    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    let nearCtx = nearCanvas.getContext("2d");
    let farCtx = farCanvas.getContext("2d");
    let w, h;

    let stableH = Math.max(window.innerHeight, spacer.offsetHeight);
    let clusters = [];
    let lastTime = 0;
    let running = false;
    let speed = fallSpeed;
    let scrollSpeed = 0;
    let lastScrollY = 0;

    function bakeMantis() {
        try {
            let scale = Math.min(1, 900 / mantis.naturalHeight);
            let c = document.createElement("canvas");
            c.width = Math.round(mantis.naturalWidth * scale);
            c.height = Math.round(mantis.naturalHeight * scale);
            let cx = c.getContext("2d");
            cx.drawImage(mantis, 0, 0, c.width, c.height);
            let pixels = cx.getImageData(0, 0, c.width, c.height);

            let bg = getComputedStyle(intro).backgroundColor.match(/[\d.]+/g);
            if (!bg || bg.length < 3) {
                throw new Error("unknown background color");
            }
            let ghost = parseFloat(getComputedStyle(mantis).opacity);

            let d = pixels.data;
            for (let i = 0; i < d.length; i += 4) {
                let alpha = d[i + 3] / 255;
                for (let k = 0; k < 3; k++) {
                    let picture = d[i + k] / 255;

                    let result = picture <= 0 ? 1 : Math.min(1, (bg[k] / 255) / picture);
                    d[i + k] = Math.round(result * 255);
                }
                d[i + 3] = Math.round(alpha * ghost * 255);
            }
            cx.putImageData(pixels, 0, 0);

            c.id = "mantis";
            c.className = "baked";
            mantis.replaceWith(c);
            mantis = c;
        } catch (e) {

        }
    }
    if (mantis.complete && mantis.naturalWidth > 0) {
        bakeMantis();
    } else {
        mantis.addEventListener("load", bakeMantis);
    }

    let endSize = parseFloat(getComputedStyle(document.body).fontSize);
    let corner = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gap"));

    function setupCanvas() {
        w = window.innerWidth;
        stableH = Math.max(window.innerHeight, spacer.offsetHeight);
        h = stableH;

        let dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia("(hover: none)").matches ? 1.5 : 2);

        [[nearCanvas, nearCtx], [farCanvas, farCtx]].forEach(function (pair) {
            let canvas = pair[0];
            let ctx = pair[1];
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
        });

        bitmapScale = dpr;
        let count = Math.max(minClusters, Math.round((w * h) / areaPerCluster));
        clusters = [];
        for (let i = 0; i < count; i++) {
            clusters.push(makeCluster(w, h));
        }

        clusters.sort(function (a, b) { return a.depth - b.depth; });
    }

    let limitFrameRate = window.matchMedia("(hover: none)").matches;

    function draw(now) {
        if (!running) return;

        if (limitFrameRate && now - lastTime < 30) {
            requestAnimationFrame(draw);
            return;
        }

        let dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        let instantScroll = (window.scrollY - lastScrollY) / Math.max(dt, 0.001);
        lastScrollY = window.scrollY;

        scrollSpeed += (instantScroll - scrollSpeed) * Math.min(dt * 10, 1);

        let wanted = fallSpeed + scrollSpeed * scrollPush;
        wanted = Math.min(Math.max(wanted, -maxUpSpeed), maxDownSpeed);

        speed += (wanted - speed) * Math.min(dt * 6, 1);

        nearCtx.clearRect(0, 0, w, h);
        farCtx.clearRect(0, 0, w, h);
        let respawned = false;
        for (let i = 0; i < clusters.length; i++) {
            let c = clusters[i];

            c.y += speed * c.speedScale * dt;

            if (c.y > h) {
                clusters[i] = c = makeCluster(w, h);
                c.y = -c.height;
                respawned = true;
            }

            if (c.y + c.height < 0) {
                clusters[i] = c = makeCluster(w, h);
                c.y = h;
                respawned = true;
            }

            if (rainMode === "b" && c.y < h && c.y + c.height > 0) {
                if (c.flicker && now > c.flicker.until) {
                    c.flicker = null;
                    drawClusterBitmap(c);
                } else if (!c.flicker && Math.random() < 0.9 * dt) {
                    let j = Math.floor(Math.random() * c.columns.length);
                    c.flicker = {
                        column: j,
                        letter: Math.floor(Math.random() * c.columns[j].text.length),
                        character: glitchLetters[Math.floor(Math.random() * glitchLetters.length)],
                        until: now + 100 + Math.random() * 250
                    };
                    drawClusterBitmap(c);
                }
            }

            if (c.y < h && c.y + c.height > 0) {
                let ctx = c.depth < mantisDepth ? farCtx : nearCtx;
                ctx.globalAlpha = c.alpha;
                ctx.drawImage(c.bitmap, c.x, c.y, c.width, c.height);
            }
        }

        if (respawned) {
            clusters.sort(function (a, b) { return a.depth - b.depth; });
        }

        requestAnimationFrame(draw);
    }

    function startDrawing() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        lastScrollY = window.scrollY;
        scrollSpeed = 0;
        requestAnimationFrame(draw);
    }

    let titleMode = null;
    let startSize = 0;
    let titleW = 0;
    let titleH = 0;

    function setupTitle() {
        startSize = Math.min(160, Math.max(48, window.innerWidth * 0.1));
        floatTitle.style.fontSize = startSize + "px";
        titleW = floatTitle.offsetWidth;
        titleH = floatTitle.offsetHeight;
        titleMode = "scaled";
        setNativeVars();
    }

    let native = window.CSS && CSS.supports("animation-timeline: scroll()");
    if (native) {
        document.documentElement.classList.add("native-intro");
    }
    function setNativeVars() {
        if (!native) return;
        let root = document.documentElement.style;
        root.setProperty("--intro-h", stableH + "px");
        root.setProperty("--logo-x0", (window.innerWidth - titleW) / 2 + "px");
        root.setProperty("--logo-y0", (stableH - titleH) / 2 + "px");
        root.setProperty("--logo-x1", corner + "px");
        root.setProperty("--logo-y1", corner + "px");
        root.setProperty("--logo-s1", endSize / startSize);
        root.setProperty("--logo-end-size", endSize + "px");
    }

    let introLocked = false;

    function lockIntro() {
        let spacerHeight = spacer.offsetHeight;
        introLocked = true;
        running = false;
        intro.remove();
        floatTitle.remove();
        spacer.remove();
        document.body.classList.remove("intro-on");

        let newY = Math.max(0, window.scrollY - spacerHeight);
        if (window.lenis) {
            window.lenis.scrollTo(newY, { immediate: true, force: true });
        } else {
            window.scrollTo(0, newY);
        }
        runBannerQueue();
    }

    function updateIntro() {
        if (introLocked) return;
        let p = Math.min(Math.max(window.scrollY / stableH, 0), 1);

        if (!native) {
            intro.style.opacity = 1 - p;
            mantis.style.transform = "translateY(" + (-12 * p) + "vh)";
        }

        if (p >= 1) {
            running = false;
        } else {
            startDrawing();
        }

        if (native) {

        } else if (p >= 0.99) {

            if (titleMode !== "final") {
                floatTitle.style.fontSize = endSize + "px";
                titleMode = "final";
            }
            floatTitle.style.transform = "translate(" + corner + "px, " + corner + "px)";
        } else {
            if (titleMode !== "scaled") {
                setupTitle();
            }

            let scale = lerp(1, endSize / startSize, p);
            let x = lerp((window.innerWidth - titleW) / 2, corner, p);
            let y = lerp((stableH - titleH) / 2, corner, p);
            floatTitle.style.transform = "translate(" + x + "px, " + y + "px) scale(" + scale + ")";
        }

        if (p >= 0.99) {
            lockIntro();
            return;
        }

        document.body.classList.toggle("intro-done", p >= 0.99);
        if (p >= 0.99) {
            runBannerQueue();
        }
    }

    setupCanvas();
    setupTitle();
    updateIntro();
    window.addEventListener("scroll", updateIntro);

    if (window.visualViewport) {
        window.visualViewport.addEventListener("scroll", updateIntro);
    }
    let lastSeenY = -1;
    function watchScroll() {
        if (window.scrollY !== lastSeenY) {
            lastSeenY = window.scrollY;
            updateIntro();
        }
        requestAnimationFrame(watchScroll);
    }
    requestAnimationFrame(watchScroll);

    window.addEventListener("load", function () {
        if (introLocked) return;
        window.scrollTo(0, 0);
        updateIntro();
    });

    let lastWidth = window.innerWidth;
    window.addEventListener("resize", function () {
        if (introLocked) return;
        if (window.innerWidth === lastWidth) {
            updateIntro();
            return;
        }
        lastWidth = window.innerWidth;
        setupCanvas();
        setupTitle();
        updateIntro();
    });
}

startIntro();
