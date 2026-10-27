// Smooth scrolling with Lenis (https://github.com/darkroomengineering/lenis).
//
// Normally the mouse wheel jumps the page a fixed distance at once. Lenis catches the wheel
// and glides the page to its destination instead. It still uses the browser's normal scrolling
// underneath, so our scroll code (the intro, the sticky header) keeps working unchanged.
// This file is loaded on every page, after the Lenis library itself.

// Phones (no hover) already scroll smoothly by themselves, and Lenis made the intro stutter
// while Safari's toolbar shrinks, so on touch screens we leave it off.
if (!window.matchMedia("(hover: none)").matches) {
    window.lenis = new Lenis({   // on window so script.js can reach it
        autoRaf: true,   // Lenis runs its own animation loop, like requestAnimationFrame in p5
        // The Kit subscribe pop-up scrolls by itself when it is taller than the screen (on a phone).
        // Inside it, leave scrolling alone. prevent() gets the element under the mouse and answers
        // true ("don't smooth this") or false.
        prevent: function (node) {
            return node.closest(".formkit-overlay") !== null;
        }
    });
    // Not set on purpose: lerp (how smooth, default 0.1), wheelMultiplier (how far one wheel turn
    // goes, default 1). Visitors who asked their computer for less motion get normal scrolling.
}
