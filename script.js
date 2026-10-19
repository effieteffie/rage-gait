// Builds the archive table from the `issues` list in issues.js.
// Think of it like p5: instead of drawing shapes on a canvas,
// we create page elements (divs, images) and put them on the page.

// The banner animation. When the mouse enters an issue's row, its black-and-white banner starts out
// pixelated (made of big blocks) and sharpens as the hover goes on, while the color picture fades in
// on top of it. The fade to color is done in CSS (see .row.playing .banner-color in style.css).
let bannerBlockStart = 60;   // at the start, the banner is made of blocks this wide (its picture is 1200 wide)
let bannerSharpenMs = 1500;  // the blocks shrink to nothing over this many milliseconds

// Gives one banner its animation.
//   row    the table row the banner belongs to
//   canvas the black-and-white copy, which we draw ourselves
//   img    the color copy
function setupBanner(row, canvas, img) {
    let ctx = canvas.getContext("2d");               // the "pen" we draw with, like in p5
    let small = document.createElement("canvas");    // a tiny canvas, used to shrink the picture into blocks
    let smallCtx = small.getContext("2d");
    let frameId = null;
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Draws the picture made of blocks that are `block` pixels wide. block = 1 means perfectly sharp.
    function draw(block) {
        let w = canvas.width;
        let h = canvas.height;
        if (block <= 1) {
            ctx.drawImage(img, 0, 0, w, h);
            return;
        }
        small.width = Math.max(1, Math.ceil(w / block));   // (setting the size also clears the canvas)
        small.height = Math.max(1, Math.ceil(h / block));
        smallCtx.imageSmoothingQuality = "high";
        smallCtx.drawImage(img, 0, 0, small.width, small.height);  // 1. shrink: each pixel is the average of a block
        ctx.imageSmoothingEnabled = false;                          // 2. blow it up again WITHOUT smoothing,
        ctx.drawImage(small, 0, 0, w, h);                           //    so every shrunk pixel becomes a visible square
    }

    // Starts (or restarts) the animation from the beginning.
    function start() {
        row.classList.add("playing");        // makes the color picture fade in (style.css)
        cancelAnimationFrame(frameId);
        if (reduceMotion) {                  // the visitor asked for less motion: no pixelation
            draw(1);
            return;
        }
        draw(bannerBlockStart);              // start from the blockiest version right away
        let startTime = performance.now();
        function frame(now) {
            // p goes from 0 (start) to 1 (after bannerSharpenMs)
            let p = Math.max(0, Math.min((now - startTime) / bannerSharpenMs, 1));
            // the blocks shrink fast at first and slowly at the end: 80, 60, 40 ... 3, 2, 1
            draw(Math.max(1, Math.round(bannerBlockStart * (1 - p) * (1 - p))));
            if (p < 1) {
                frameId = requestAnimationFrame(frame);
            }
        }
        frameId = requestAnimationFrame(frame);
    }

    function stop() {
        cancelAnimationFrame(frameId);
        row.classList.remove("playing");     // the color picture fades away again
    }

    // Once the picture has loaded we know its size, so we can set the canvas to match.
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
        // A touch screen has no hover: play when the row scrolls into view, and reset when it leaves.
        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.intersectionRatio >= 0.6) {
                    start();
                } else if (!entry.isIntersecting) {
                    stop();
                }
            });
        }, { threshold: [0, 0.6] }).observe(row);
    } else {
        row.addEventListener("mouseenter", start);
        row.addEventListener("mouseleave", stop);
    }
}

// Makes one table row from a list of 4 pieces of text.
// banner is an image path (or nothing); altText describes the image.
// url is the issue's page (or nothing): if given, the title becomes a link.
// threshold (optional) is how bright a banner pixel must be to turn white, from 0 to 1.
function makeRow(cells, banner, altText, url, threshold) {
    // like p5's createDiv(): make a new empty <div>
    let row = document.createElement("div");
    row.className = "row grid";

    // one class name per column, in order (positions 0, 1, 2, 3)
    let cellClasses = ["col-title", "col-number", "col-date", "col-words"];

    // plain for loop, same as in p5: i goes 0, 1, 2, 3
    for (let i = 0; i < cells.length; i++) {
        let cell = document.createElement("div");
        cell.className = cellClasses[i]; // pick the class at position i

        if (i === 0 && url) {
            // first cell (the title) and we have a page: make it a link
            let link = document.createElement("a");
            link.href = url;
            link.textContent = cells[i];
            cell.appendChild(link);
        } else {
            cell.textContent = cells[i]; // put the text inside the div
        }

        row.appendChild(cell);           // put the cell inside the row
    }

    // only rows that have a banner get the hidden banner area
    if (banner) {
        let wrap = document.createElement("div");
        wrap.className = "banner-wrap";

        // the frame holds two copies of the same picture, stacked on top of each other
        let frame = document.createElement("div");
        frame.className = "banner-frame";
        if (threshold !== undefined) {
            frame.style.setProperty("--threshold", threshold); // read by the CSS filter
        }

        let canvas = document.createElement("canvas");   // the black-and-white copy (drawn by setupBanner)
        canvas.className = "banner-threshold";
        canvas.setAttribute("aria-hidden", "true");      // screen readers use the color picture's description

        let img = document.createElement("img");         // the color copy
        img.className = "banner-color";
        img.src = banner;
        img.alt = altText;

        frame.appendChild(canvas);
        frame.appendChild(img);
        wrap.appendChild(frame);
        row.appendChild(wrap);

        setupBanner(row, canvas, img);
    }

    return row; // hand the finished row back to whoever called us
}

// Fills <div id="archive"> with one row per issue.
// (The column-name row is written by hand in index.html.)
function buildTable() {
    let archive = document.getElementById("archive");
    archive.innerHTML = ""; // start empty so running this twice never duplicates rows

    // one row per issue: i goes 0, 1, 2, ... up to the last issue
    for (let i = 0; i < issues.length; i++) {
        let issue = issues[i]; // the current issue, like issues[i] in p5

        let row = makeRow(
            [issue.title, issue.number, issue.date, issue.wordCount],
            issue.banner,
            issue.title,
            issue.url, // undefined if the issue has no url: that's fine
            issue.threshold
        );
        archive.appendChild(row);
    }
}

buildTable(); // runs once when the page loads, like setup() in p5

// ---------- Opening animation ----------
// The page opens on a screen full of falling text from the poster, with "rage gait" in the
// middle. Every block of text is a "cluster" with a depth: far ones are small, slow and faint,
// near ones are big, fast and solid, which gives a feeling of 3D. As you scroll down, the title
// travels to the top-left corner and the text fades away, so the archive slides up underneath.
// Scrolling back up reverses it.

// The writing from the poster. Each line below is one cluster. Every word becomes its own
// vertical column of stacked letters, and a space inside a word ("A SPECTRE") leaves a gap.
let phrases = [
    ["EVERY", "FRIDAY"],
    ["A SPECTRE", "IS", "HAUNTING", "THE", "INTERNET"],
    ["A", "NEWSLETTER", "BY", "GÜLNISA"],
    ["INTERNET", "CULTURE", "CRITICISM", "AND", "MORE"]
];

let mantisDepth = 0.5;        // clusters with a depth below this are drawn BEHIND the mantis, the rest in front
let areaPerCluster = 90000;  // one cluster for every 180000 square pixels (bigger = fewer clusters)
let minClusters = 5;          // never fewer than this, even on a small window, so the screen never goes empty
let letterStep = 1.5;         // distance from one letter to the next in a column (x the text size)
let columnStep = 1.9;         // distance from one column to the next (x the text size)
let maxStagger = 2.5;         // how many letters lower a column can start than the top of the cluster
let farSize = 10;             // text size of the farthest clusters (px)
let nearSize = 26;            // text size of the nearest clusters (px)
let farSpeed = 0.25;          // far clusters fall at 0.25 x the normal speed
let nearSpeed = 1.8;          // near clusters fall at 1.8 x the normal speed
let farAlpha = 0.25;          // far clusters are faint (0 = invisible, 1 = solid)
let fallSpeed = 90;           // the normal fall speed, in pixels per second

// How the clusters react to scrolling
let scrollPush = 0.6;    // bigger = scrolling changes the speed more
let maxUpSpeed = 120;    // scrolling up moves them up, but never faster than this (px per second)
let maxDownSpeed = 1500; // scrolling down speeds them up, but never beyond this

// p = 0 gives a, p = 1 gives b, in between gives a mix. Same as lerp() in p5.
function lerp(a, b, p) {
    return a + (b - a) * p;
}

// Makes one cluster of text at a random place, with a random depth.
function makeCluster(w, h) {
    let depth = Math.random(); // 0 = far away, 1 = right in front of you
    let size = lerp(farSize, nearSize, depth);
    let words = phrases[Math.floor(Math.random() * phrases.length)];

    // Every word is a column. Each column starts a random amount lower than the top,
    // which gives the staggered look of the poster.
    let columns = [];
    let rows = 0; // how many letters tall the whole cluster is
    for (let i = 0; i < words.length; i++) {
        let offset = Math.random() * maxStagger;
        columns.push({ text: words[i], offset: offset });
        rows = Math.max(rows, offset + words[i].length);
    }

    let width = size + (words.length - 1) * columnStep * size;
    return {
        x: Math.random() * Math.max(w - width, 0),             // left edge
        y: Math.random() * (h + rows * letterStep * size) - rows * letterStep * size, // top edge
        height: rows * letterStep * size,
        columns: columns,
        depth: depth,
        size: size,                                   // near = big
        speedScale: lerp(farSpeed, nearSpeed, depth), // near = fast
        alpha: lerp(farAlpha, 1, depth)               // near = solid, far = faint
    };
}

function startIntro() {
    let intro = document.getElementById("intro");
    let nearCanvas = document.getElementById("ascii");     // in front of the mantis
    let farCanvas = document.getElementById("ascii-far");  // behind the mantis
    let mantis = document.getElementById("mantis");
    let floatTitle = document.getElementById("float-title");
    let spacer = document.getElementById("intro-spacer");

    // Skip the intro if index.html decided so (see the little script at the top of <body>),
    // or if the visitor asked their computer to reduce motion
    let skip = !document.body.classList.contains("intro-on") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip) {
        intro.remove();
        floatTitle.remove();
        spacer.remove();
        document.body.classList.remove("intro-on");
        return;
    }

    // Browsers remember your scroll position and put you back there on reload.
    // We always want to start at the top, so switch that off and scroll to the top.
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    let nearCtx = nearCanvas.getContext("2d"); // a ctx is the "pen" we draw with: one per canvas
    let farCtx = farCanvas.getContext("2d");
    let w, h;
    let clusters = [];              // the list of all falling clusters of text
    let lastTime = 0;
    let running = false;
    let speed = fallSpeed;          // the speed right now (changes smoothly; negative = moving up)
    let scrollSpeed = 0;            // how fast the page is being scrolled (px per second, down = positive)
    let lastScrollY = 0;

    // Where the title ends up: the same size as the page's normal text, and the same gap from
    // the corner as --gap. We read both from the CSS, so changing font-size or --gap there
    // changes this too, with nothing to update here.
    let endSize = parseFloat(getComputedStyle(document.body).fontSize);
    let corner = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gap"));

    // Sizes the canvas to the window and creates the characters.
    // dpr makes it sharp on high-resolution (retina) screens.
    function setupCanvas() {
        w = window.innerWidth;
        h = window.innerHeight;
        let dpr = window.devicePixelRatio || 1;
        // do the same setup for both canvases
        [[nearCanvas, nearCtx], [farCanvas, farCtx]].forEach(function (pair) {
            let canvas = pair[0];
            let ctx = pair[1];
            canvas.width = w * dpr;     // changing the size also resets the pen's settings,
            canvas.height = h * dpr;    // so we set them again below
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.textAlign = "center";   // x is the middle of each character
            ctx.textBaseline = "middle";
            ctx.fillStyle = "black";
        });

        let count = Math.max(minClusters, Math.round((w * h) / areaPerCluster));
        clusters = [];
        for (let i = 0; i < count; i++) {
            clusters.push(makeCluster(w, h));
        }
        // far ones first, near ones last, so near clusters are drawn on top
        clusters.sort(function (a, b) { return a.depth - b.depth; });
    }

    // draw() runs once per frame (about 60 times a second), like draw() in p5
    function draw(now) {
        if (!running) return;

        // time since the last frame, in seconds (capped so a paused tab doesn't jump)
        let dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // How fast is the user scrolling? (distance moved since the last frame / time)
        let instantScroll = (window.scrollY - lastScrollY) / Math.max(dt, 0.001);
        lastScrollY = window.scrollY;
        // smooth it out, because mouse wheels scroll in little jumps
        scrollSpeed += (instantScroll - scrollSpeed) * Math.min(dt * 10, 1);

        // The speed we want: the normal fall speed, pushed by the scrolling.
        // Scroll down = faster. Scroll up = slows down, then moves up (slowly).
        let wanted = fallSpeed + scrollSpeed * scrollPush;
        wanted = Math.min(Math.max(wanted, -maxUpSpeed), maxDownSpeed); // keep between the limits

        // Ease toward the wanted speed instead of jumping, so it feels like it has weight
        speed += (wanted - speed) * Math.min(dt * 6, 1);

        nearCtx.clearRect(0, 0, w, h);
        farCtx.clearRect(0, 0, w, h);
        let respawned = false;
        for (let i = 0; i < clusters.length; i++) {
            let c = clusters[i];

            // each cluster moves at the shared speed times its own depth factor
            // (this difference between near and far is what creates the parallax)
            c.y += speed * c.speedScale * dt;

            // fell completely off the bottom: come back in at the top as a brand new cluster
            if (c.y > h) {
                clusters[i] = c = makeCluster(w, h);
                c.y = -c.height;
                respawned = true;
            }
            // moved completely off the top (scrolling up): come back in at the bottom
            if (c.y + c.height < 0) {
                clusters[i] = c = makeCluster(w, h);
                c.y = h;
                respawned = true;
            }

            // far clusters go on the back canvas (behind the mantis), near ones on the front one
            let ctx = c.depth < mantisDepth ? farCtx : nearCtx;
            ctx.globalAlpha = c.alpha;
            ctx.font = c.size + "px 'Helvetica Neue', Helvetica, Arial, sans-serif";

            // draw every column, letter by letter
            for (let j = 0; j < c.columns.length; j++) {
                let column = c.columns[j];
                let x = c.x + c.size / 2 + j * columnStep * c.size; // the middle of this column
                for (let k = 0; k < column.text.length; k++) {
                    let letter = column.text[k];
                    let y = c.y + (column.offset + k + 0.5) * letterStep * c.size;
                    if (letter !== " " && y > -c.size && y < h + c.size) {
                        ctx.fillText(letter, x, y);
                    }
                }
            }
        }
        // new clusters got a new random depth, so put the list back in far-to-near order
        if (respawned) {
            clusters.sort(function (a, b) { return a.depth - b.depth; });
        }

        requestAnimationFrame(draw); // ask the browser to call draw() again next frame
    }

    function startDrawing() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        lastScrollY = window.scrollY; // so we don't count the time we weren't drawing as scrolling
        scrollSpeed = 0;
        requestAnimationFrame(draw);
    }

    // Runs on every scroll. p is how far through the intro we are: 0 = top, 1 = one screen down.
    function updateIntro() {
        let p = Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1);

        intro.style.opacity = 1 - p; // the characters fade as you scroll
        mantis.style.transform = "translateY(" + (-12 * p) + "vh)"; // the mantis drifts up slowly

        // no point drawing once it's invisible; start again if you scroll back up
        if (p >= 1) {
            running = false;
        } else {
            startDrawing();
        }

        // The title: from the middle of the screen (big) to the top-left corner (small)
        let startSize = Math.min(160, Math.max(48, window.innerWidth * 0.1));
        floatTitle.style.fontSize = lerp(startSize, endSize, p) + "px";
        floatTitle.style.left = lerp(window.innerWidth / 2, corner, p) + "px";
        floatTitle.style.top = lerp(window.innerHeight / 2, corner, p) + "px";
        let pull = -50 * (1 - p); // -50% centers it on its own middle; 0% at the corner
        floatTitle.style.transform = "translate(" + pull + "%, " + pull + "%)";

        // Only clickable once it has arrived in the corner (0.99 instead of 1 leaves a little room for rounding)
        floatTitle.style.pointerEvents = p >= 0.99 ? "auto" : "none";

        // Same moment: tell the CSS that the intro is finished (or not, if you scrolled back up)
        document.body.classList.toggle("intro-done", p >= 0.99);
    }

    setupCanvas();
    updateIntro();
    window.addEventListener("scroll", updateIntro);

    // Some browsers restore the old scroll position only after the page has finished loading,
    // so scroll to the top once more at that moment.
    window.addEventListener("load", function () {
        window.scrollTo(0, 0);
        updateIntro();
    });
    window.addEventListener("resize", function () {
        setupCanvas();
        updateIntro();
    });
}

startIntro();
