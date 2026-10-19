// Builds the archive table from the `issues` list in issues.js.
// Think of it like p5: instead of drawing shapes on a canvas,
// we create page elements (divs, images) and put them on the page.

// The banner animation. When the mouse enters an issue's row, its black-and-white banner starts out
// pixelated (made of big blocks) and sharpens as the hover goes on, while the color picture fades in
// on top of it. The fade to color is done in CSS (see .row.playing .banner-color in style.css).
let bannerBlockStart = 60;   // at the start, the banner is made of blocks this wide (its picture is 1200 wide)
let bannerSharpenMs = 1500;  // the blocks shrink to nothing over this many milliseconds

// On touch screens the banners take turns, from the latest issue to the earliest, so the page
// seems to reveal itself over time instead of everything happening at once. Each one plays once.
let bannerGapMs = 900;       // time between one banner starting and the next one starting
let bannerWaiting = [];      // banners that are on screen and waiting for their turn
let bannerTimer = null;      // set while we're in the pause after a banner started

// true on pages without the intro, and once you've scrolled all the way through the intro
function introIsOver() {
    let body = document.body;
    return !body.classList.contains("intro-on") || body.classList.contains("intro-done");
}

// Starts the next waiting banner (if it's allowed to), then waits a moment before the one after.
function runBannerQueue() {
    if (bannerTimer || bannerWaiting.length === 0 || !introIsOver()) {
        return;
    }
    // a smaller order number means a later issue (issue 6 is order 0), so it goes first
    bannerWaiting.sort(function (a, b) { return a.order - b.order; });
    bannerWaiting.shift().start();
    bannerTimer = setTimeout(function () {
        bannerTimer = null;
        runBannerQueue();
    }, bannerGapMs);
}

// Gives one banner its animation.
//   row    the table row the banner belongs to
//   canvas the black-and-white copy, which we draw ourselves
//   img    the color copy
//   order  0 for the latest issue, 1 for the one before, and so on
function setupBanner(row, canvas, img, order) {
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
        // A touch screen has no hover. Each banner plays ONCE, the first time it is mostly on
        // screen, and the banners take turns from the latest issue to the earliest (runBannerQueue).
        let observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.intersectionRatio >= 0.5) {
                    observer.unobserve(row);   // only the first time
                    bannerWaiting.push({ order: order, start: start });
                    // wait a moment: banners that appear together are reported one after the other,
                    // and we want all of them in the line-up before choosing who goes first
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

// Makes one table row from a list of 4 pieces of text.
// banner is an image path (or nothing); altText describes the image.
// url is the issue's page (or nothing): if given, the title becomes a link.
// threshold (optional) is how bright a banner pixel must be to turn white, from 0 to 1.
function makeRow(cells, banner, altText, url, threshold, order) {
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

        setupBanner(row, canvas, img, order);
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
            issue.threshold,
            i   // 0 for the latest issue, 1 for the next, ...
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
let smallScreenScale = 0.6;      // on a phone, every letter is this much of its normal size
let bitmapScale = 1;             // how many real pixels per CSS pixel the clusters are drawn with (set in setupCanvas)
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
    let scale = window.innerWidth <= 800 ? smallScreenScale : 1;   // smaller letters on a phone
    let size = lerp(farSize, nearSize, depth) * scale;
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
    let height = rows * letterStep * size;

    // Draw the whole cluster ONCE onto a small canvas of its own. After that, every frame only has to
    // COPY this picture to a new position, which is far cheaper than drawing every letter again
    // (drawing text is slow, and a phone is slower at it than a computer).
    let bitmap = document.createElement("canvas");
    bitmap.width = Math.ceil(width * bitmapScale);
    bitmap.height = Math.ceil(height * bitmapScale);
    let bctx = bitmap.getContext("2d");
    bctx.scale(bitmapScale, bitmapScale);
    bctx.font = size + "px 'Helvetica Neue', Helvetica, Arial, sans-serif";
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.fillStyle = "black";
    for (let j = 0; j < columns.length; j++) {
        let column = columns[j];
        let x = size / 2 + j * columnStep * size;   // the middle of this column, inside the picture
        for (let k = 0; k < column.text.length; k++) {
            let letter = column.text[k];
            if (letter !== " ") {
                bctx.fillText(letter, x, (column.offset + k + 0.5) * letterStep * size);
            }
        }
    }

    return {
        x: Math.random() * Math.max(w - width, 0),             // left edge
        y: Math.random() * (h + height) - height,              // top edge
        width: width,
        height: height,
        bitmap: bitmap,
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

    // ---- Test switches, for finding out what makes the intro slow on a phone ----
    // Add one to the address (open it in a NEW tab, the intro only plays once per tab):
    //   ?nochars    no falling text      ?nomantis   no mantis ghost      ?nobanners   no banners in the archive
    // They can be combined, like  ?nochars&nomantis . Safe to delete once the lag is solved.
    let testSwitches = new URLSearchParams(window.location.search);
    if (testSwitches.has("nomantis")) {
        intro.classList.add("no-mantis");           // style.css hides the mantis for this class
    }
    if (testSwitches.has("nobanners")) {
        document.body.classList.add("no-banners");  // style.css hides the banners for this class
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

    // The mantis ghost is made with a "Divide" blend, which the browser would redo on every
    // frame (slow, especially on phones). Here we do the same maths ONCE, pixel by pixel, and put
    // the finished ghost in place of the picture. If the browser won't let us read the picture's
    // pixels (for example when the page is opened straight from a file), we keep the CSS version.
    function bakeMantis() {
        try {
            let scale = Math.min(1, 900 / mantis.naturalHeight);   // a faint ghost doesn't need every pixel
            let c = document.createElement("canvas");
            c.width = Math.round(mantis.naturalWidth * scale);
            c.height = Math.round(mantis.naturalHeight * scale);
            let cx = c.getContext("2d");
            cx.drawImage(mantis, 0, 0, c.width, c.height);
            let pixels = cx.getImageData(0, 0, c.width, c.height);   // can fail: that's what the try is for

            let bg = getComputedStyle(intro).backgroundColor.match(/[\d.]+/g);   // "rgb(234, 174, 211)" -> 234, 174, 211
            if (!bg || bg.length < 3) {
                throw new Error("unknown background color");
            }
            let ghost = parseFloat(getComputedStyle(mantis).opacity);   // the ghost strength from the CSS

            let d = pixels.data;   // red, green, blue, alpha of every pixel, one after the other
            for (let i = 0; i < d.length; i += 4) {
                let alpha = d[i + 3] / 255;
                for (let k = 0; k < 3; k++) {
                    let picture = d[i + k] / 255;
                    // Divide: background / picture (and never more than 1)
                    let result = picture <= 0 ? 1 : Math.min(1, (bg[k] / 255) / picture);
                    d[i + k] = Math.round(result * 255);
                }
                d[i + 3] = Math.round(alpha * ghost * 255);   // the ghost strength becomes see-through-ness
            }
            cx.putImageData(pixels, 0, 0);

            c.id = "mantis";
            c.className = "baked";   // style.css turns the live blend off for this one
            mantis.replaceWith(c);
            mantis = c;              // updateIntro() moves this one as you scroll
        } catch (e) {
            // keep the plain picture with its CSS blend
        }
    }
    if (mantis.complete && mantis.naturalWidth > 0) {
        bakeMantis();
    } else {
        mantis.addEventListener("load", bakeMantis);
    }

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
        // dpr = how many real pixels make up one CSS pixel (3 on many phones). More pixels look
        // sharper but take much longer to draw, so we cap it: this is a moving, faint background.
        let dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia("(hover: none)").matches ? 1.5 : 2);
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

        bitmapScale = dpr;   // the cluster pictures are made as sharp as the canvas they are copied onto
        let count = testSwitches.has("nochars") ? 0 : Math.max(minClusters, Math.round((w * h) / areaPerCluster));
        clusters = [];
        for (let i = 0; i < count; i++) {
            clusters.push(makeCluster(w, h));
        }
        // far ones first, near ones last, so near clusters are drawn on top
        clusters.sort(function (a, b) { return a.depth - b.depth; });
    }

    // draw() runs once per frame (about 60 times a second), like draw() in p5
    // A phone draws about 30 frames a second instead of 60: half the work, and slowly falling text still looks smooth.
    let limitFrameRate = window.matchMedia("(hover: none)").matches;

    function draw(now) {
        if (!running) return;

        // too soon since the last frame we drew? skip this one (lastTime is only updated when we do draw)
        if (limitFrameRate && now - lastTime < 30) {
            requestAnimationFrame(draw);
            return;
        }

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

            // far clusters go on the back canvas (behind the mantis), near ones on the front one.
            // We only COPY the cluster's ready-made picture, and only if it is on screen.
            if (c.y < h && c.y + c.height > 0) {
                let ctx = c.depth < mantisDepth ? farCtx : nearCtx;
                ctx.globalAlpha = c.alpha;
                ctx.drawImage(c.bitmap, c.x, c.y, c.width, c.height);
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

    // ---- The logo that travels to the corner ----
    // Changing a text's font-size, top and left on every scroll event makes the browser lay the text out
    // and redraw its letters at a new size every frame. That is fine on a computer but choppy on a phone.
    // So while you scroll we keep the font-size fixed (the big starting size) and only change `transform`
    // (move + scale), which the browser can do on the graphics chip without redrawing any letters.
    // When the logo has arrived, we switch ONCE to its real final size, so it ends up perfectly sharp.
    let titleMode = null;     // "scaled" while travelling, "final" once it has arrived
    let startSize = 0;        // the big font-size it starts with
    let titleW = 0;           // how wide and tall the logo is at that starting size
    let titleH = 0;

    function setupTitle() {
        startSize = Math.min(160, Math.max(48, window.innerWidth * 0.1));
        floatTitle.style.fontSize = startSize + "px";
        titleW = floatTitle.offsetWidth;
        titleH = floatTitle.offsetHeight;
        titleMode = "scaled";
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
        if (p >= 0.99) {
            // arrived: switch to the real final size (sharp text) and sit exactly in the corner
            if (titleMode !== "final") {
                floatTitle.style.fontSize = endSize + "px";
                titleMode = "final";
            }
            floatTitle.style.transform = "translate(" + corner + "px, " + corner + "px)";
        } else {
            if (titleMode !== "scaled") {
                setupTitle();   // scrolled back up: go back to the big size
            }
            // scale goes from 1 (big) down to the final size / the big size; the box's top-left corner
            // travels from where it sits when centered to the corner of the screen
            let scale = lerp(1, endSize / startSize, p);
            let x = lerp((window.innerWidth - titleW) / 2, corner, p);
            let y = lerp((window.innerHeight - titleH) / 2, corner, p);
            floatTitle.style.transform = "translate(" + x + "px, " + y + "px) scale(" + scale + ")";
        }

        // Only clickable once it has arrived in the corner (0.99 instead of 1 leaves a little room for rounding)
        floatTitle.style.pointerEvents = p >= 0.99 ? "auto" : "none";

        // Same moment: tell the CSS that the intro is finished (or not, if you scrolled back up)
        document.body.classList.toggle("intro-done", p >= 0.99);
        if (p >= 0.99) {
            runBannerQueue();   // banners may have been waiting for the intro to finish
        }
    }

    setupCanvas();
    setupTitle();
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
        setupTitle();
        updateIntro();
    });
}

startIntro();
